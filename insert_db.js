/* dependent packages and files required */
import fetch from 'node-fetch';
import log from './utils/logger.js';
import { get_token } from './auth_handler.js';
import config from './config/config_catchpoint.js';
import config_postgres from './config/config_postgres.js';
import pkg from 'pg';
const { Client } = pkg;


/* 

functions:
        Function Name                   Description
    fetch_Data            :     function to fetch data from LastRaw API
    convert_data          :     function to convert JSON from LastRaw API to Line Protocol
    write_data            :     function to write lines of data into PostgreSQL
    get_token             :     function to get Access token 

*/

// Global letiable
const raw_data_url = `${config.base_url}${config.last_raw_path}`;
const client_key = config.client_key;
const client_secret = config.client_secret;
const test_types = config.tests;     
const pg_user = config_postgres.user;
const pg_host = config_postgres.host;
const pg_db = config_postgres.database;
const pg_pw = config_postgres.password;
const pg_port = config_postgres.port;
const table_name = config_postgres.table_name;

// main function to fetch and store data
async function run() {
    try {
        let token = await get_token(client_key, client_secret);
        let tests_list = [];
        // breakdown the tests list into chunks of 50 test ids for each test type
        Object.keys(test_types).forEach(function (key, index) {
            let temp = [], chunk = 50;
            for (let i = 0, j = test_types[key].length; i < j; i += chunk) {
                temp.push(test_types[key].slice(i, i + chunk));
            }
            tests_list.push(temp);
        });
        for (let tests of tests_list) {
            for (let arr of tests) {
                let url = raw_data_url + arr;
                let raw_data = await fetch_Data(token, url);
                let json_line = convert_data(raw_data);
                if (json_line != "No Data") {
                    write_data(json_line);
                }
                else {
                    log.info("No Data for the last 15 minutes");
                }
            }
        }
    }
    catch (err) {
        // let error = new Error(err);
        log.error(err);
    }
}

// function to fetch Raw Data
function fetch_Data(token, url) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(json => {
                // if object has property Message ,display Error, else Process Data
                if (json.hasOwnProperty('Message')) {
                    log.error(`${json.Message}`);
                    reject(json.Message)
                } else {
                    log.info("<<Fetched Raw Test Data>>", url, "Raw Data Start Timestamp: " + json.start + " End Timestamp: " + json.end)
                    if (json.hasOwnProperty('error')) {
                        log.error(`${json.error}`, "<<Check Catchpoint configuration file>>")
                    }
                    resolve(json)
                }

            }).catch(err => {
                log.error(err)
                reject(err)
            }
            );
    });
}
// function to parse and convert JSON to PostgreSQL
function convert_data(structure) {
    // Checks if there is test data for the last 15 mins
    if (structure['detail'] != null) {
        let test_params = []
        let final_list = []
        let lines = []

        for (let value of structure['detail']['fields']['synthetic_metrics']) {
            let metrics = value['name']
            test_params.push(metrics)
        }

        for (let value of structure['detail']['items']) {
            let values = {}
            for (let i in value) {
                if (i != 'synthetic_metrics') {
                    if (i == 'dimension') {
                        values.data_timestamp = value[i]['name']
                    }
                    if (i == 'breakdown_1') {
                        values.breakdown_1 = value[i]['name']
                    }
                    if (i == 'breakdown_2') {
                        values.breakdown_2 = value[i]['name']
                    }
                    if (i == 'hop_number') {
                        values.hop_number = value[i]
                    }
                    if (i == 'step') {
                        values.step = value[i]
                    }
                }
            }
            let metric_values = value['synthetic_metrics']
            let fields = {}
            for (let i = 0; i < metric_values.length; i++){
                fields[test_params[i]]=metric_values[i]
            }
            values['metrics'] = fields
            final_list.push(values)
            }  
            lines = final_list  
            return lines

        }   
    else {
        return ("No Data");
    }
}

//function to write lines of data to PostgreSQL
async function write_data(lines) {
    log.info("<<#Lines passed to Write function>>", lines.length);
    console.log(JSON.stringify(lines[0]))
    const client = new Client({
        user : pg_user,
        host :pg_host,
        database : pg_db,
        password : pg_pw,
        port : pg_port,
    });
    await client.connect();
    const create_table_query = `
    CREATE TABLE if not exists ${table_name}(id serial NOT NULL PRIMARY KEY, info json NOT NULL);
    `;
    client.query(create_table_query).then(result => {
        if (result) {
            console.log('Table created');
        }
    });
    

    try {

        for (let i = 0; i < lines.length; i++){
            let metrics = JSON.stringify(lines[i])
            log.info(metrics)
            await client.query(`INSERT INTO ${table_name}(info)VALUES('${metrics}')`)
        }
         } catch (error) {
        console.error(error.stack);
        return false;
    } finally {
        console.log('FINISHED')
        log.info("<<Finished writing data>>")
        await client.end();               // closes connection
    }
}
   


//Run the main function
//let interval=setInterval(run,900000)
run();

export {
    convert_data,
    fetch_Data,
    write_data
}
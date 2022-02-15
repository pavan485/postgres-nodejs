# postgres-nodejs
#
Catchpoint Integration with PostgreSQL
---

PostgreSQL is a powerful, open source object-relational database system.
This integration relies on a NodeJS script that runs once every15 minutes to pull raw performance data of synthetic tests. The raw performance data pulled through REST API is parsed with correct timestamp, breakdowns and all performance metrics to be stored in PostgreSQL. Once the data is stored in PostgreSQL, it can be connected to any analytics tools and plot similar graphs to Catchpoint with ease.


## Prerequisites
1. NodeJS v16.x
2. PostgreSQL v13.x
3. Catchpoint account with a REST API consumer

## Installation and Configuration
1. Copy the nodejs-mongo folder to your machine
2. Run npm install in the directory /nodejs-mongo

### Configuration
1.	In the “config_catchpoint.yaml” file under config sub-directory, enter your Catchpoint API consumer key and secret. This can be found in the API details page.
2.	In the test_ids dictionary of the “config_catchpoint.js” file, enter the Test IDs you want to pull the data for in an array format. 

Note: Please make sure to enter only the Test ID in the array belonging to the respective Test Type


*Example:*

---
    tests: 
    {
        web: [142613,142614,142615,142616],
        transaction: [142602,142603],
        api: [142683,142689,155444],
        ping: [142600],
        traceroute: [142607,142608,142609],
        dns: [942639,142640,142641],
        websocket: [842700],
        smtp: [142604]
    }

---
3.	In the "config_postgres.js" file, enter your PostgreSQL server address and port. The default Graphite URL for a local installation is http://localhost:5432

## How to run
- In the /postgres-nodejs directory, run `node insert_db.js` after uncommenting the `var interval=setInterval(run,900000)` and commenting out the `run()` line in the same file

**or**

- Create a cronjob to run the "insert_db.js" script every 15 minutes.

*Example crontab entry, if the "insert_db.js" file resides in /usr/local/bin/*

`*/15 * * * * cd /usr/local/bin/ && node /usr/local/bin/insert_db.js > /usr/local/bin/logs/cronlog.log 2>&1`


## File Structure

    postgres-nodejs/
    ├── auth_handler.js       ## Contains APIs related to authentication       
    ├── config
    | ├── config_catchpoint.js## Configuration file for Catchpoint 
    | ├── config_postgres.js     ## Configuration file for PostgreSQL
    ├── logs
    | ├── info
    | |  ├── info.log         ## Contains informational logs. File name will be based on date of execution
    | ├── error
    | |  ├── error.log        ## Contains error logs. File name will be based on date of execution          
    ├── utils
    | ├── logger.js           ## logger utility
    ├──package.json           ## project dependencies
    └── insert_db.js          ## main file


Once the script starts running and data is inserted into PostgreSQL, it can queried using PsQL.

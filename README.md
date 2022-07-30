# auckland-transport-emissions-api-nzta-express-mongo-mysql

# 🚀 Nodejs with Express API to pull data from NZTA live feed and post to a db. Example implementation of first stage of full emissions visualization environment. 🚀

https://github.com/coding-to-music/auckland-transport-emissions-api-nzta-express-mongo-mysql

From / By

## Environment variables:

```java

```

## GitHub

```java
git init
git add .
git remote remove origin
git commit -m "first commit"
git branch -M main
git remote add origin git@github.com:coding-to-music/auckland-transport-emissions-api-nzta-express-mongo-mysql.git
git push -u origin main
```

# ATE

## Research Emissions Model for Auckland Transport

This repo contains the code used to scrape data from the Auckland Transport API, and join this data with other data to create a single model of a sample of the bus operations on the Auckland Transport network between Dec 2020-Jan 2021.

## Setup

Nodejs is used as the runtime environment for the program so this must be installed.

Nodejs is available for download [here](https://nodejs.org/en/download/).

Installation and Running:

<ol>
    <li>  In a console, navigate to `YourInstallationDirectory/ATE` </li>
    <li>  Enter `npm install package.json` 
          This will install all the necessary packages for our program </li>
    <li>  In the console, while still located in `/ATE` folder, type `node views/app.js` </li>
    <li>  Navigate to `localhost:3000` to interact with the server now running on your machine. </li>
</ol>

## Quick start guide

Our data pipeline is an implementation for us to show one way to completely generate the emissions of a given dataset. This serves as both the preprocessor and the processor (clean and join datasets to form Operational Dataset, and use Pax data with Fleet data to generate the emissions.)

Aquiring data, and calling endpoints until `/join_routes_to_final` serve as preprocessing. `/join_pax_km` and `/calculate_emissions` perform the emissions calculating step.

Be aware you may change the connection object via `const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });` OR changing var `config.mongodb.uri` to your connection object.

### Aquiring data

Be aware you may change the connection object via `const client = new MongoClient(config.mongodb.uri, { useUnifiedTopology: true });` OR changing var `config.mongodb.uri` to your connection object.

#### Realtime Data

The script `realtimeScript\RealtimeScript.js` must be run continuously to create the necessary data from the AT API. This can be deployed on a local machine and left running, however this is vulnerable to power failures. It was previously run inside a screen env on a server master node for ~2months with approx ~24hrs downtime.

The subscription key can be changed with the var at the top (serach for "let key").

#### Schedule Data

The script `models\scheduleConfiguration.js` can be run once everytime the schedule changes.

**_NOTE_** If the current datasets are between generation and the schedule changes (ie we once had trips scheduled for 24.01 but it change on 21.01) please run the `/repair_database` endpoint to fix the dataset before generating the next.

### Installing necessary data

Assuming you have run the script to pull the schedule automatically, and you have the data needed, data can be inserted using the mongoimport tool (Windows dist here: https://docs.mongodb.com/database-tools/installation/installation-windows/). Heres an example of the import urls for our datasets:

`mongoimport --db teste --jsonArray --collection calendar --drop --file "calendar.json" mongoimport --db teste --jsonArray --collection calendarDate --drop --file "calendarDate.json" mongoimport --db teste --collection realtime_raw --drop --file "realtime_raw.json" mongoimport --db teste --jsonArray --collection routes --drop --file "routes.json" mongoimport --db teste --jsonArray --collection trips --drop --file "trips.json" mongoimport --db teste --jsonArray --collection versions --drop --file "versions.json"`

**_NOTE_** There is no connection URL in these imports so mongoimport will import these to a local db. Please ensure that your db connection objects are consistent across files, and match the db you import these collections to.

The main endpoints to generate the necessary dataset are:

- `/generate_schedule`
- `/join_raw_routes_to_final`
- `/join_pax_km`
- `/calculate_emissions`

In order to use these end points, we need the schedule information in the format specified, and the raw information in the same placed into a MongoDB Database.

The connection object within `views\app.js` at the top must be changed to suit your connection to your database. It currently looks like `const client = new MongoClient(config.testing.uri, { useUnifiedTopology: true });`, prehaps with a different first arg (the connection uri). The db object (search for "let dbo") must also be changed to the correct collection for your data.

The pipeline has some dependancies on hardcoded dates, this is mainly due to time constraints. Please change the hard coded dates in the four endpoints above to suit your dataset, otherwise the pipeline will not work.

Finally, calling these 4 endpoints above in order will generate the completed dataset.

## API

Endpoints:

| Endpoint                         | Function                                                                                                                                                                                                                                 | Arguments                                                                                                                                                                                                                                                                                                | Response                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/distinct`                      | Ensure all existing entries in db are unique. Get all the distinct UUIDs from the realtime_raw dataset and compare this with all the entries                                                                                             | -                                                                                                                                                                                                                                                                                                        | none, prints to console                                           |
| `/completed_trips`               | Test for trips without stop info and save to db collection                                                                                                                                                                               | -                                                                                                                                                                                                                                                                                                        | none, prints to console                                           |
| `/compare_UUIDs`                 | Get all the UUIDs for a day then send these to the schedule for comparison, do the same for the schedule. This tells us roughly how many trips are missing from the realtime and the schedule                                            | Query Params: <ol><li><b>dates</b>=: a date or range of dates for the data to fall between (inclusive)</li><ul><li>..\* dates in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)</li></ul></ol>                                                                                                  | none, prints to console                                           |
| `/compare_scheduled_to_observed` | Get a day by day comparison of the trips in the schedule as the base table, and whether or not their UUIDs are present in the realtime. Take all the UUIDs from the schedule and compare                                                 | -                                                                                                                                                                                                                                                                                                        | none, prints to console                                           |
| `/compare_observed_to_schedule`  | Get the raw info for each day, then compare to schedule to see if the UUID of each journey is present in the schedule                                                                                                                    | -                                                                                                                                                                                                                                                                                                        | none, prints to console.                                          |
| `/generate_schedule`             | Auto generate valid trips from realtime_raw, append route information; used to filter to provider. Auto generate schedule from trips, routes, calendar and calendarDates. Creates collection until todays date                           | -                                                                                                                                                                                                                                                                                                        | either generated data or response message                         |
| `/repair_database`               | Fix calendarDates, calendar, versions and exisiting schedule when the AT API changes                                                                                                                                                     | -                                                                                                                                                                                                                                                                                                        | Response message.                                                 |
| `/get_raw_data`                  | Get the raw realtime data provided by the AT API, optionally between a range of dates, and download data for each day.                                                                                                                   | Query Params: <ol><li><b>download</b>=true: download local copy</li><li><b>dates</b>=: a date or range of dates for the data to fall between (inclusive)</li><ul><li>..\* dates in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)</li></ul></ol>                                                | JSON format data between dates provided, or 2020/12/23-2021/01/23 |
| `/get_processed_schedule`        | Get the schedule generated by the pipeline. Must be run after data pipeline has been finished.                                                                                                                                           | Query Params: <ol><li><b>download</b>=true: download local copy</li><li><b>dates</b>=: a date or range of dates for the data to fall between (inclusive)</li><ul><li>..\* dates in form [{1} DD/MM/YYYY{1} [, DD/MM/YYYY]? ]{1} (<--regex)</li></ul><li>day=true: get the day by day breakdown</li></ol> | JSON format data between dates provided, or 2020/12/23-2021/01/23 |
| `/compare_stops`                 | Get the stops present in the schedule and compare to the number of stops expected for this trip_id                                                                                                                                       | -                                                                                                                                                                                                                                                                                                        | JSON format data of journeys with missing stop information        |
| `/generate_schedule_distances`   | **CAUTION** This uses several thousand API requests and sends each individually due to the design of the API we interact with through the method. Get the distances for each trip in the filtered dataset (excluding service providers). | -                                                                                                                                                                                                                                                                                                        | none?                                                             |
| `/generate_schedule_stops`       | **CAUTION** This uses several thousand API requests and sends each individually due to the design of the API we interact with through the method. Add the scheduled stop sequence to schedule info.                                      | -                                                                                                                                                                                                                                                                                                        | none?                                                             |
| `/setupPAXKm_collection`         | Checks that the passenger kilometers loaded through the filesystem is producing sensible numbers                                                                                                                                         | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/pax_km_sanity_check`           | Checks that the passenger kilometers loaded through the filesystem is producing sensible numbers                                                                                                                                         | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/generate_observed_distance`    | Test if the distances we get from the shape files are the same as theirs from the pax_km collection                                                                                                                                      | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/fill_missing_data`             | Used to add bus information to the model for observations missing stop info. Also produces output reporting on observations missing stop info                                                                                            | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/join_raw_routes_to_final`      | Join the raw to the final. Used to calc speed writes to new collection main_collection. main_collection used by calc_emissions below                                                                                                     | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/join_pax_km`                   | Join the passenger km data to the main_collection. Also creates distances in this version of the pipeline                                                                                                                                | -                                                                                                                                                                                                                                                                                                        | none                                                              |
| `/calculate_emissions`           | Using speed, pax km, bus info and trip info, calc emissions. Output this file to the filesystem (saves the result to dataBackups/emissions_AT_20201224-20210112).                                                                        | -                                                                                                                                                                                                                                                                                                        | none                                                              |

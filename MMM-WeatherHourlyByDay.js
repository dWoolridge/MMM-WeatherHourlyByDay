/* US WeatherProvider */

/* MagicMirror²
 * Module: WeatherHourlyByDay 
 *
 * By Doug Woolridge
 * MIT Licensed.
 */
Module.register("MMM-WeatherHourlyByDay", {

        // Default module config.
        defaults: {
                showLocationInHeader: false,
                dailyStartHour: 0,
                dailyEndHour:   23,
                daysToShow:     2,

                showWeatherIcon: true,
                showTemperature: true,
                showWindSpeed:  true,
                showWindDirection: true,

                hourlyFilteredArray: [],
                locationName: "",
                dayLabels: [],

                units: config.units,
                useKmh: false,
                tempUnits: config.units,
                windUnits: config.units,
                updateInterval: 10 * 60 * 1000, // every 10 minutes
                animationSpeed: 1000,
                timeFormat: config.timeFormat,
                showPeriod: true,
                showPeriodUpper: false,
                showWindDirection: true,
                showWindDirectionAsArrow: false,
                useBeaufort: true,
                lang: config.language,
                showHumidity: false,
                showSun: true,
                degreeLabel: false,
                decimalSymbol: ".",
                showIndoorTemperature: false,
                showIndoorHumidity: false,
                maxNumberOfDays: 5,
                maxEntries: 5,
                ignoreToday: false,
                fade: true,
                fadePoint: 0.25, // Start on 1/4th of the list.
                initialLoadDelay: 0, // 0 seconds delay
                appendLocationNameToHeader: true,
                calendarClass: "calendar",
                tableClass: "small",
                onlyTemp: false,
                showPrecipitationAmount: false,
                colored: false,
                showFeelsLike: true,
                absoluteDates: false,
                weekdayList: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
        },

        requiresVersion: "2.1.0",
   
        loaded: function(callback) {
                this.finishLoading();
                Log.log(this.name + ' is loaded!');
                callback();
        },
        start: function() {
                // Add custom filters
                this.addFilters();

                Log.log(this.name + ' is started!');
        },

        getTemplate: function () {
                return "hourlybyday.njk";
        },

        getTemplateData: function () {
                return {
                        config: this.config,
                        hourly: this.config.hourlyFilteredArray,
                        location: this.config.locationName,
                };
        },

        getHeader: function() {
                if ( this.config.showLocationInHeader ) {
                        return this.data.header + " " + this.config.locationName; 
                } else {
                        return this.data.header; 
                        }
        },

        getScripts: function () {
                  return [ "weatherobjecthourlybyday.js" ];
        },

        getStyles: function () {
                return ["hourlybyday.css"];
        },

        notificationReceived: function(notification, payload, sender) {
                if ( sender && notification === "WEATHER_UPDATED" && payload.forecastArray.length > 0 ) {
                        // Log.warn("GOT FORECAST DATA!!");
                        //Log.warn(payload);
                }
                if ( sender && notification === "WEATHER_UPDATED" && payload.hourlyArray.length > 0 ) {
//Log.info("WEATHER_UPDATED notification:  sender=" + sender.config.weatherProvider);
                        this.translateHourlyWindData(payload);
                        this.updateDom();
                        Log.info(this.name + " got hourly forcast data from sender " + sender.config.weatherProvider);
                }
        },

        translateHourlyWindData: function(payload) {
                this.config.hourlyFilteredArray = [];
                this.config.locationName = payload.locationName;
                payloadLastEntry = payload.hourlyArray.length - 1;
  
                if ( this.config.dailyStartHour > this.config.dailyEndHour ) {
                        bridgeMidnight = true; 
                        this.config.dailyEndHour = this.config.dailyEndHour + 24;
                } else {
                        bridgeMidnight = false;
                }
//Log.info("bridgeMidnight=" + bridgeMidnight );

//Log.info(".length=" + payload.hourlyArray.length + "::payloadLastEntry=" + payloadLastEntry);

                // Start Date
                cDate = new Date(payload.hourlyArray[0].date);
                startHour = Number(cDate.getHours());
//Log.info("startHour=" + startHour + "::startDate=" + cDate.toUTCString() );

                // End Date
                cDate = new Date(payload.hourlyArray[payloadLastEntry].date);
                endHour = Number(cDate.getHours());
//Log.info("endHour=" + endHour + "::endDate=" + cDate.toUTCString() );

                // Current Date
                cDate = new Date();
                curHour = Number(cDate.getHours());
//Log.info("curHour=" + curHour + "::cDate=" + cDate.toUTCString() );
//Log.info("payload.hourlyArray[0].temperature);

                hourOffset = -startHour;

                if ( curHour > endHour ) {
                        hourOffset = hourOffset + 24;
                        pDate = cDate;
                        cDate = new Date(pDate.getDate() + 86400000);
                }

                // Set up the Table Headers
                this.config.dayLabels.push("Time"); 
                for ( let dayNum = 0; dayNum < this.config.daysToShow; dayNum++ ) {
                        tDate = new Date();
                        tDate.setHours(0,0,0,0);
                        hourNum = this.config.dailyStartHour; 
                        for ( let i = this.config.dailyStartHour; i <= this.config.dailyEndHour; i++ ) {
                                hr = hourNum + hourOffset + (24 * dayNum); 
                                if ( hr >= 0 ) {
                                        if ( hr >= payloadLastEntry ) {
                                                this.config.dayLabels.push(this.config.weekdayList[tDate.getDay()]); 
                                        } else {
                                                pDate = new Date(payload.hourlyArray[hr].date);
                                                pDate.setHours(0,0,0,0);
                                                if ( tDate.getTime() === pDate.getTime() ) {
                                                        this.config.dayLabels.push("Today"); 
                                                } else {
                                                        tDate.setDate(tDate.getDate() + 1 );
                                                        if ( tDate.getTime() === pDate.getTime() ) {
                                                                this.config.dayLabels.push("Tomorrow"); 
                                                        } else {
                                                                this.config.dayLabels.push(this.config.weekdayList[pDate.getDay()]); 
                                                        }
                                                }
                                        }
                                        break; 
                                }
                                if ( ++hourNum > 23 ) { hourNum = 0 };
                        }
                        tDate.setDate(tDate.getDate() + 1 );
                }

                hourNum = this.config.dailyStartHour; 
                for ( let i = this.config.dailyStartHour; i <= this.config.dailyEndHour; i++ ) {
                        let tempHour = new WeatherObjectHourlyByDay(this.config.units, this.config.tempUnits, this.config.windUnits, this.config.useKmh);
                        var pDate = new Date( cDate.getFullYear(), cDate.getMonth(), cDate.getDate(), hourNum, 0, 0, 0 );
                        tempHour.date = pDate;

                        for ( let dayNum = 0; dayNum < this.config.daysToShow; dayNum++ ) {
                                if ( bridgeMidnight && hourNum < this.config.dailyStartHour ) {
                                        hr = hourNum + hourOffset + (24 * (dayNum + 1)); 
                                } else {
                                        hr = hourNum + hourOffset + (24 * dayNum); 
                                }

//Log.info( "dayNum=" + dayNum + "::hourNum=" + hourNum + "::hr=" + hr );
                                if ( hr < 0 || hr >= payloadLastEntry ) {
                                        tempHour.weatherTypeArray.push("---");
                                        tempHour.temperatureArray.push("---");
                                        tempHour.windDirectionArray.push("---");
                                        tempHour.windSpeedArray.push("---");
                                } else {
                                        tempHour.weatherTypeArray.push(payload.hourlyArray[hr].weatherType);
                                        tempHour.temperatureArray.push(payload.hourlyArray[hr].temperature);
                                        var windTemp = payload.hourlyArray[hr].windSpeed;
//Log.info("windTemp=" + windTemp);
                                        windTemp = windTemp.split(" ")[0];
//windTemp = "XXX";
                                        tempHour.windSpeedArray.push(windTemp);
                                        tempHour.windDirectionArray.push(payload.hourlyArray[hr].windDirection);
//Log.info("-->" + payload.hourlyArray[hr].date + "::" + payload.hourlyArray[hr].temperature + "::" + payload.hourlyArray[hr].weatherType + "::" + payload.hourlyArray[hr].windSpeed + "::" + payload.hourlyArray[hr].windDirection);
                                }
                        }
                        cDate = new Date(pDate.getDate() + 3600000);
                        this.config.hourlyFilteredArray.push(tempHour);
                        if ( ++hourNum > 23 ) { hourNum = 0 };
                } 
        },

        roundValue: function (temperature) {
                const decimals = this.config.roundTemp ? 0 : 1;
                const roundValue = parseFloat(temperature).toFixed(decimals);
                return roundValue === "-0" ? 0 : roundValue;
        },

        addFilters() {
                this.nunjucksEnvironment().addFilter(
                        "formatTime",
                        function (date) {
                                date = moment(date);

                                if (this.config.timeFormat !== 24) {
                                        if (this.config.showPeriod) {
                                                if (this.config.showPeriodUpper) {
                                                        return date.format("h:mm A");
                                                } else {
                                                        return date.format("h:mm a");
                                                }

                                        } else {
                                                return date.format("h:mm");
                                        }
                                }

                                return date.format("HH:mm");
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "unit",
                        function (value, type) {
                                if (type === "temperature") {
                                        if (this.config.tempUnits === "metric" || this.config.tempUnits === "imperial") {
                                                value += "°";
                                        }
                                        if (this.config.degreeLabel) {
                                                if (this.config.tempUnits === "metric") {
                                                        value += "C";
                                                } else if (this.config.tempUnits === "imperial") {
                                                        value += "F";
                                                } else {
                                                        value += "K";
                                                }
                                        }
                                } else if (type === "precip") {
                                        if (value === null || isNaN(value) || value === 0 || value.toFixed(2) === "0.00") {
                                                value = "";
                                        } else {
                                                if (this.config.weatherProvider === "ukmetoffice" || this.config.weatherProvider === "ukmetofficedatahub") {
                                                        value += "%";
                                                } else {
                                                        value = `${value.toFixed(2)} ${this.config.units === "imperial" ? "in" : "mm"}`;
                                                }
                                        }
                                } else if (type === "humidity") {
                                        value += "%";
                                }

                                return value;
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "roundValue",
                        function (value) {
                                return this.roundValue(value);
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "decimalSymbol",
                        function (value) {
                                return value.toString().replace(/\./g, this.config.decimalSymbol);
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "calcNumSteps",
                        function (forecast) {
                                return Math.min(forecast.length, this.config.maxNumberOfDays);
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "calcNumEntries",
                        function (dataArray) {
                                return Math.min(dataArray.length, this.config.maxEntries);
                        }.bind(this)
                );

                this.nunjucksEnvironment().addFilter(
                        "opacity",
                        function (currentStep, numSteps) {
                                if (this.config.fade && this.config.fadePoint < 1) {
                                        if (this.config.fadePoint < 0) {
                                                this.config.fadePoint = 0;
                                        }
                                        const startingPoint = numSteps * this.config.fadePoint;
                                        const numFadesteps = numSteps - startingPoint;
                                        if (currentStep >= startingPoint) {
                                                return 1 - (currentStep - startingPoint) / numFadesteps;
                                        } else {
                                                return 1;
                                        }
                                } else {
                                        return 1;
                                }
                        }.bind(this)
                );
        }
   }
);

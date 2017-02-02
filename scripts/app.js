(function () {
	'use strict';


	var app = new Vue({
		el: '#app',
		data: {
			query: '',
			results: [],
			baseUrl: 'https://portland.craigslist.org/search/sss=',
			queryPrefix: '&query=',
			formatPrefix: '?format=',
			format: 'rss',
			sortPrefix: '&sort=',
			sort: 'rel',
			fogbugzUrl: 'https://altsource.fogbugz.com/f/api/0/jsonapi',
			username: '',
			password: '',
			token: null,
			hasToken: false,
			searchQuery: '',
			searchResults: {},
			timeIntervals: {},
			fogbugzLinkUrl: 'https://altsource.fogbugz.com/f/cases/',
			listView: true,
			caseView: false,
			searchView: false,
			caseActive: false,
			currentCase: {},
			dayToShow: moment(),
			timeWorked: moment.duration(0, 'minutes'),
			minutesWorked: 0
		},
		mounted: function () {
			// MAking 2days timer
			var donutData = {
				labels: [
					"Minutes Worked",
					"Minutes Left"
				],
				datasets: [
					{
						data: [0, 480],
						backgroundColor: [
							"#FF6384",
							"#FFCE56",
							"#36A2EB"
						],
						hoverBackgroundColor: [
							"#FF6384",
							"#FFCE56",
							"#36A2EB"
						]
					}
				]
			};
			var donutOptions = {
				legend: {
					display: false
				}
			};
			utilities.donut.initialize(donutData, donutOptions);

			//donut clock initializing

			donutData = {
				labels: [
					"Minutes Worked",
					"Minutes Left"
				],
				datasets: [
					{
						data: [0, constants.twentyFourHoursInMinutes],
						backgroundColor: [
							"#FF6384",
							"#F9F9F9",
							"#36A2EB"
						],
						hoverBackgroundColor: [
							"#FF6384",
							"#FFCE56",
							"#36A2EB"
						]
					}
				]
			};
			donutOptions = {
				legend: {
					display: false
				}
			};

			utilities.donutClock.initialize(donutData, donutOptions)


			utilities.router.initializeState();
		},
		methods: {
			addToken: function () {
				if (this.token) {
					utilities.authenticator.addToken(this.token)
					this.hasToken = true;
					this.getTimeSheet(this.dayToShow);
				}

			},
			logon: function () {
				utilities.authenticator.logon(this.username, this.password);
			},
			setActiveCase: function (caseId) {
				var bugcase = {

				};

				utilities.loader.start();
				utilites.api(bugcase).then(this.setCase);
			},
			search: function () {
				var search = {
					"cmd": "search",
					"token": utilities.authenticator.getToken(),
					"q": this.searchQuery,
					"max": 5,
					"cols": ["sTitle", "sStatus"]
				};

				utilities.loader.start();
				utilities.api(search).then(this.handleResponse);
			},
			startWork: function (bug) {
				var startWork = {
					"cmd": "startWork",
					"token": utilities.authenticator.getToken(),
					"ixBug": this.searchQuery
				};

				utilities.loader.start('loading...');
				utilities.api(startWork).then(this.handleResponse);
			},

			getTimeSheet: function (date) {
				var startTime = moment(date).startOf('day');
				var endTime = moment(date).endOf('day');

				var listIntervals = {
					"cmd": "listIntervals",
					"token": utilities.authenticator.getToken()
				};

				var listIntervalsForDate = {
					"cmd": "listIntervals",
					"token": utilities.authenticator.getToken(),
					"dtStart": startTime.toJSON(),
					"dtEnd": endTime.toJSON()
				}

				utilities.loader.start();
				utilities.api(listIntervalsForDate).then(this.handleResponse2);

			},
			prepareClockData: function (clockInputData) {
				var date = clockInputData[0].dtStart;
				var startOfDay = moment(date).startOf('day');
				var endOfDay = moment(date).endOf('day');
				var betterClockData = [];

				// Strip the data to just be start & end
				for (var i = 0; i < clockInputData.length; i++) {
					var start = moment(clockInputData[i].dtStart);
					var end = moment(clockInputData[i].dtEnd);

					betterClockData.push({
						'start': start,
						'end': end
					});
				}

				var startOfTimeData = [];


				// Turn the data into a bunch of durations
				var tempDuration = {
					'time': moment.duration(startOfDay.diff(betterClockData[0].start)).asMinutes(),
					'isWork': false
				};
				startOfTimeData.push(JSON.parse(JSON.stringify(tempDuration)));

				for (var i = 0; i < betterClockData.length; i++) {
					tempDuration = {
						'time': moment.duration(betterClockData[i].end.diff(betterClockData[i].start)).asMinutes(),
						'isWork': true
					};
					// debugger;
					startOfTimeData.push(JSON.parse(JSON.stringify(tempDuration)));

					if (i < betterClockData.length - 1) {
						tempDuration.time = moment.duration(betterClockData[i + 1].start.diff(betterClockData[i].end)).asMinutes();
						tempDuration.isWork = false;
						startOfTimeData.push(JSON.parse(JSON.stringify(tempDuration)));
					}
				}
				debugger;
				tempDuration.time = moment.duration(endOfDay.diff(betterClockData[betterClockData.length-1].end)).asMinutes();
				tempDuration.isWork = false;
				startOfTimeData.push(JSON.parse(JSON.stringify(tempDuration)));

				
				// Clean it... Remove 0 values and convert MS to Minutes
				var cleanedData = [];
				
				// for (var i = 0; i < startOfTimeData.length; i++) {
					
				// 	cleanedData.push(Math.floor(startOfTimeData[i].asMinutes()));
					
				// }
				utilities.donutClock.update(startOfTimeData);
			},
			showPreviousDay: function () {
				this.getTimeSheet(this.dayToShow.subtract(1, 'days'));
			},
			showNextDay: function () {
				this.getTimeSheet(this.dayToShow.add(1, 'days'));
			},
			calculateTimeWorked: function () {
				this.timeWorked = moment.duration(0);
				if (!this.timeIntervals.intervals) {
					return;
				}

				for (var i = 0; i < this.timeIntervals.intervals.length; i++) {
					var startMoment = moment(this.timeIntervals.intervals[i].dtStart)
					if (this.timeIntervals.intervals[i].dtEnd) {
						var endMoment = moment(this.timeIntervals.intervals[i].dtEnd)
					} else {
						var endMoment = moment();
					}


					var duration = moment.duration(endMoment.diff(startMoment));

					this.timeWorked = this.timeWorked.add(duration);

				}

				this.minutesWorked = Math.floor(this.timeWorked.asMinutes());


				utilities.donut.update(this.minutesWorked);
			},
			handleResponse: function (response) {
				this.searchResults = $.parseJSON(response).data;
				utilities.loader.stop();
			},
			handleResponse2: function (response) {
				this.timeIntervals = $.parseJSON(response).data;
				utilities.loader.stop();
				this.calculateTimeWorked();
				this.prepareClockData(this.timeIntervals.intervals)
			},
			showList: function () {
				this.listView = true;
				this.caseView = false;
				this.searchView = false;
			},
			showSearch: function () {
				this.listView = false;
				this.caseView = false;
				this.searchView = true;
			},
			showCase: function () {
				this.listView = false;
				this.caseView = true;
				this.searchView = false;
			}
		}
	});
})();
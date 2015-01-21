var ChartModel = {
  model: {
    info:         {},
    index:        {},
    minute:       {},
    sentiment:    {},
    indexError:   true,
    sentimentError: true,
    dataReceived: 0
  },
  api: {
    production:     'http://www.imaibo.net',
    staging:        'http://t3-www.imaibo.net',
    base:           '/index.php?app=moodindex&mod=IndexShow',
    indexData:      '&act=main',
    dailyIndexData: '&daily=1',
    weeklyIndexData:'&act=getStkWeeklyLineAjax',
    sentimentData:  '&act=moodindexLine',
    latest:         '&latest=1',
    minute:         '&minute=1',
    date:           '&reqDate=',
    dailyLineSdate: '&dailyLineSdate=',
    weeklyLineSdate: '&weeklyLineSdate=',
    jsonp:          '&callback=?'
  },
  currEarliestTime: 0,
  endOfSentiment: false,
  baseUrl: function(){
    return PRODUCTION ? this.api.production : this.api.staging;
  },
  getIndexDataAsync: function(options, cb){
    var self = this;
    return $.Deferred(function(d){
      self.getIndexData(options, d.resolve, cb);
    }).promise();
  },
  getSentimentDataAsync: function(options, cb){
    var self = this;
    return $.Deferred(function(d){
      self.getSentimentData(options, d.resolve, cb);
    }).promise();
  },
  updateSentimentDataAsync: function(date){
    var self = this;
    return $.Deferred(function(d){
      self.updateSentimentData(date, d.resolve, d.reject);
    }).promise();
  },
  apiBuilder: function(requestChart, options) {
    var api = this.baseUrl() + this.api.base;
    // var today = new Date().yyyymmdd();
    if(requestChart === 'index') {
      api += (options.weekly ? this.api.weeklyIndexData : '');
      api += (options.daily ? this.api.dailyIndexData + this.api.indexData : '');
      api += ((options.daily&&options.date) ? this.api.dailyLineSdate + options.date : '');
      api += ((options.daily&&options.date) ? this.api.indexData+this.api.latest : '');
      api += ((options.weekly&&options.date) ? this.api.weeklyLineSdate + options.date : '');
      api += (options.info ? '&info=1&trading=1' : '');
    }else{
      api += this.api.sentimentData;
    }
    api += this.api.jsonp;
    return api;
  },
  getInitialData: function () {
    var self = this;
    var indexOptions = {
      daily: true,
      info: true
    };
    var sentimentOptions = {};
    var indexCallback = function (data, handler) {
      var newData = data.daily ? data.daily.stockLine : [];
      for (var key in data) {
        if (key === 'daily') {
          self.model.index.stockLine = newData.reverse();
        } else {
          self.model[key] = data[key];
        }
      }
      handler(self.model.indexError);
    };
    var sentimentCallback = function (data, handler) {
      self.model.sentiment = data;
      handler(self.model.sentimentError);
    };
    return $.when(ChartModel.getIndexDataAsync(indexOptions, indexCallback), ChartModel.getSentimentDataAsync(sentimentOptions, sentimentCallback));
  },
  /*
   * func getIndexData()
   * ===================
   * Arguments:
   * - date: date in yyyymmdd format
   * - initial: boolean, indicates if we are only fetching new data
   * - handler: callback function
   * - updateByDragging: boolean, indicates if we are updating by dragging index chart
  */
  getIndexData: function(options, handler, cb){
    var self = this;

    var indexApi = self.apiBuilder('index' , options);
    $.getJSON(indexApi, function(res) {
      self.errorCheckIndex(res, options);
      if(res.code !== 'undefined' && res.code === 0 && !self.model.indexError){
        cb(res.data, handler);
      }
    }).fail(function(){
      handler({ isError: self.model.indexError });
    });
  },
  updateIndexData: function (options) {
    var self = this;
    var callback = function (data, handler) {
      var newData;
      var timestamps = [];
      if (data.daily) { 
        newData = data.daily.stockLine.reverse();
      } else if (data.weeklyKLine) {
        newData = data.weeklyKLine.reverse();
      }

      self.model.index.stockLine = self.model.index.stockLine.concat(newData)
      .sort(function (a, b) {
        return a.timestamp - b.timestamp;
      })
      .filter(function (d) {
        if (timestamps.indexOf(d.timestamp) === -1) {
          timestamps.push(d.timestamp);
          return true;
        }
      });
      if (!!data.latestPrice && data.daily) {
        if (data.latestPrice.timestamp > self.model.index.stockLine[self.model.index.stockLine.length-1].timestamp) {
          self.model.index.stockLine.push(data.latestPrice);
        } else {
          // console.log('there is no data');
        }
      }
      handler(self.model.indexError);
    };
    return $.when(ChartModel.getIndexDataAsync(options, callback));
  },
  refreshIndexData: function (options) {
    var self = this;
    var callback = function (data, handler) {
      if (data.daily) { 
        self.model.index.stockLine = data.daily.stockLine.reverse();
      } else if (data.weeklyKLine) {
        self.model.index.stockLine = data.weeklyKLine.reverse();
      }
      handler(self.model.indexError);
    };
    return $.when(ChartModel.getIndexDataAsync(options, callback));
  },
  getSentimentData: function(options, handler, cb){
    var self = this;
    
    var sentimentApi = self.apiBuilder('sentiment' , options);
    $.getJSON(sentimentApi, function(res) {
      self.errorCheckSentiment(res, options);
      if(res.code !== 'undefined' && res.code === 0 && !self.model.sentimentError) {
        cb(res.data, handler);
      }
    }).fail(function(){
      handler({ isError: self.model.sentimentError });
    });
  },
  updateSentimentData: function(options){
    var self = this;
    var callback = function (data) {
      self.model.sentiment = data;
    };
    return $.when(ChartModel.getSentimentDataAsync(options, callback));
  },
  /* Checks if variable is object */
  isObject: function(val){
    if (val === null) { return false; }
    return typeof val === 'object';
  },
  /* Checks if variable is empty object */
  isEmptyObject: function(obj) {
    for (var prop in obj) {
      if(obj.hasOwnProperty(prop)) return false;
    }
    return true;
  },
  errorCheckSentiment: function(res, options){
    if(res.data === undefined){
        this.log(0, 'Sentiment API has no \'data\'');
      } else if (!this.isObject(res.data) || this.isEmptyObject(res.data)){
        this.log(0, 'Sentiment API "data" variable is not an object or is empty');
      } else if (res.data.indexList === undefined || res.data.indexList.length === 0){
        this.log(0, 'Sentiment API data.indexList does not exist');
      } else if (res.data.indexList[0].price === undefined){
        this.log(0, 'Sentiment API data.indexList does not have variable "price"');
      } else if (res.data.indexList[0].volumn === undefined){
        this.log(0, 'Sentiment API data.indexList does not have variable "volumn"');
      } else if (res.data.indexList[0].timestamp === undefined){
        this.log(0, 'Sentiment API data.indexList does not have variable "timestamp"');
      } else if (res.data.indexList[0].rdate === undefined){
        this.log(0, 'Sentiment API data.indexList does not have variable "rdate"');
      } else if (res.data.moodindexList === undefined || res.data.moodindexList.length === 0){
        this.log(0, 'Sentiment API data.moodindexList does not exist');
      } else {
        this.model.sentimentError = false;
      }
  },
  errorCheckIndex: function(res, options){
    this.model.indexError = true;
    var type
    if (!!options.daily) {
      type = 'daily';
    } else if (!!options.weekly) {
      type = 'weeklyKLine';
    }
    if(res.data === undefined){
      this.log(0, 'Index API has no \'data\'');
    } else if(!this.isObject(res.data) || this.isEmptyObject(res.data)){
      this.log(0, 'Index API "data" variable is not an object or is empty');
    } else if(options.info && (res.data.info === undefined || this.isEmptyObject(res.data.info))){
      this.log(0, 'Index API data.info does not exist');
    } else if(options.info && (res.data.info.stockIndexInfo === undefined || this.isEmptyObject(res.data.info.stockIndexInfo))){
      this.log(0, 'Index API data.info.stockIndexInfo does not exist');
    } else if(options.info && (res.data.info.moodindexInfo === undefined || this.isEmptyObject(res.data.info.moodindexInfo))){
      this.log(0, 'Index API data.info.moodindexInfo does not exist');
    } else if(options.info && (res.data.info.tradingSign === undefined || this.isEmptyObject(res.data.info.tradingSign))){
      this.log(0, 'Index API data.info.tradingSign does not exist');
    } else if(!!type && (res.data[type] === undefined || res.data[type].length === 0)){
      this.log(0, 'Index API data ' + [type] + ' does not exist');
    } else if(type==='daily' && (res.data[type].stockLine === undefined || res.data[type].stockLine.length === 0)){
      this.log(0, 'stockLine Data does not exist');
    } else {
      this.model.indexError = false;
    }
  },
  processIndexData: function(res, options){
    var self = this;
    var index = self.model.index;

    if(initial){
      self.model.index = res.data[ChartView.properties.mode];
      // API returns data in descending order
      if(self.model.index.stockLine[0].timestamp != res.data.latestPrice.timestamp) {
        self.model.index.stockLine.unshift(res.data.latestPrice);
      }
      self.model.index.stockLine.reverse();
    } 
    else if(updateByDragging){
      ChartModel.errorCheckIndex(res, false);

      if(ChartModel.model.indexError) return;

      var stockLine = res.data[ChartView.properties.mode].stockLine;
      var returnedLatestTime = stockLine.slice(-1).pop().timestamp;

      this.currEarliestTime  = this.currEarliestTime || index.stockLine[0].timestamp;
     
     //mark if no more sentiment data is returned. i.e assuming when it returns 0
      this.endOfSentiment = this.endOfSentiment || stockLine
                                                    .map(function(e) { return e.moodindex === 0; })
                                                    .reduce(function(prev, curr, i, arr) { return prev || curr; });

      if(this.currEarliestTime < returnedLatestTime) return;
      if(this.endOfSentiment) return;

      //original earliest, latest
      //for loop of returned
      // if timestamp < earliest, 
      // c


      //concat two
      // sort by timestamp
      // remove duplicate timestamp



      //api returned in descending order
      stockLine.reverse();
      var orgLength = index.stockLine.length;
      index.stockLine = stockLine.concat(index.stockLine);
      ChartModel.model.stockLineLengthDiff = index.stockLine.length - orgLength- 10;
      this.currEarliestTime = index.stockLine[0].timestamp;
    } else if (ChartView.properties.mode === 'daily') {
      var latestPrice = res.data.latestPrice;
      var lastData    = self.model.index.stockLine.slice(-1).pop();

      if(lastData && lastData.timestamp !== res.data.latestPrice.timestamp){
        self.model.index.stockLine.push(res.data.latestPrice);
      }
      //weekly
    } else {
      self.model.index.stockLine = res.data.weeklyKLine;
    }
  },
  log: function(code, message) {
    if(PRODUCTION) return;
    var now = new Date();
    console.log('%c [' +  now.toTimeString() +'] ' + message, 'color: red; font-size: 1.5em;');
  },
  /* Helper method for randomizing API values for testing */
  randomize: function(){
    // Randomize stock price
    var stockIndexSign = Math.random() > 0.5;
    if (stockIndexSign){
      this.model.info.stockIndexInfo.sign = '+';
      this.model.info.stockIndexInfo.lastpx += Math.round(Math.random()*100*100)/100;
      this.model.info.stockIndexInfo.pxchg = +Math.round(Math.random()*100*100)/100;
    } else {
      this.model.info.stockIndexInfo.sign = '-';
      this.model.info.stockIndexInfo.lastpx -= Math.round(Math.random()*100*100)/100;
      this.model.info.stockIndexInfo.pxchg = -Math.round(Math.random()*100*100)/100;
    }

    // Randomize mood index
    this.model.info.moodindexInfo.before = Math.round((Math.random()-0.5)/0.5*100*100)/100;
    this.model.info.moodindexInfo.latest = (parseFloat(this.model.info.moodindexInfo.latest) + this.model.info.moodindexInfo.change).toFixed(2);

    // Randomize trading sign
    var tradingSign = Math.random();
    this.model.info.tradingSign.prob = 0.6 + Math.round(Math.random()*40)/100;
    if(tradingSign < 0.3){
      this.model.info.tradingSign.signal = -1;
    } else if (tradingSign < 0.6){
      this.model.info.tradingSign.signal = 0;
    } else {
      this.model.info.tradingSign.signal = 1;
    }
  }
};

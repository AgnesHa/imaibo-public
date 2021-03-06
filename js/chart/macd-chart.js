/**
 * MacdChart renders MACD chart
 */
var MacdChart = {
  properties: {},
  data: {},
  components: {},

  /**
   * setProperties() sets width, margin, zoom factor and other dimensions of chart
   */
  setProperties: function(options) {
    var properties = {
      height: 130,
      interval: 40,
    };
    properties.chartHeight = properties.height - ChartView.properties.margin.top - ChartView.properties.margin.bottom;
    properties.graphWidth = ChartView.properties.chartWidth * ChartView.properties.zoomFactor;
    if (options) {
      for (var key in options) {
        properties[key] = options[key];
      }
    }
    this.properties = $.extend(true, {}, properties);
  },

  /**
   * init() initializes chart
   */
  init: function() {
    if(ChartView.data.indexError) return;
    this.setProperties();
    this.updateData();
    this.appendComponents();
    this.draw();
    this.initCloseAction();
    $('#macd').css('display', 'none');
    this.hideScrollbar();
  },

  /**
   * update() handles chart updates after initial load
   */
  update: function(options) {
    this.setProperties(options);
    this.updateData();
    this.draw();
  },

  /**
   * update() updates chart data
   */
  updateData: function() {
    var self = this;

    self.data.stockLine = ChartView.data.visibleStockLine;
    self.data.xLabelData = ChartView.getXLabels();
    var y1Diff = d3.max(self.data.stockLine.map(function(x) {return Math.abs((+x.diff)); }));
    var y2Diff = d3.max(self.data.stockLine.map(function(x) {return Math.abs((+x.macd)); }));
    var y1Range = self.helpers.getRangeWithBuffer(y1Diff*-1, y1Diff);
    var y2Range = self.helpers.getRangeWithBuffer(y2Diff*-1, y2Diff);
    self.data.y1 = ChartView.buildY(y1Range[0], y1Range[1], self.properties.chartHeight);
    self.data.y2 = ChartView.buildY(y2Range[0], y2Range[1], self.properties.chartHeight);
    self.data.x  = ChartView.x('rdate');
    this.updateLegends();
  },

  /**
   * hideScrollbar()
   */
  hideScrollbar: function() {
    if(IE8){
      MacdChart.components.scrollBar
          .attr('fill-opacity', 0);
    }else{
      MacdChart.components.scrollBar
          .style('fill-opacity', 0);
    }
  },

  /**
   * initCloseAction()
   */
  initCloseAction: function() {
    $('#macd > .wrapper > .buttons > .close').on('click', function() {
      $('#macd').css('display', 'none');
      // $('#macd').slideUp(300);
      $('#macd-checkbox').attr('checked', false);
    });
  },

  /**
   * appendComponents()
   */
  appendComponents: function() {
    var self = this;
    $('#macd-chart').empty();
    $('#macd-chart-label').empty();
    self.componentsBuilder.chart.append();
    self.componentsBuilder.chartLabel.append();
    self.componentsBuilder.topBorder.append();
    self.componentsBuilder.rightBorder.append();
    self.componentsBuilder.bottomBorder.append();
    self.componentsBuilder.leftBorder.append();
    self.componentsBuilder.y1Labels.append();
    self.componentsBuilder.y2Labels.append();
    self.componentsBuilder.xLabels.append();
    self.componentsBuilder.bars.append();
    self.componentsBuilder.scrollbarRail.append();
    self.componentsBuilder.scrollBar.append();

    // DEA line
    this.components.chart.append('path')
      .attr('class','dea');

    // MACD line
    this.components.chart.append('path')
      .attr('class','macd');

    // Tooltip
    self.componentsBuilder.mouseOverlay.append();
  },

  /**
   * drawContainer()
   */
  drawContainer: function() {
    var self = this;
    self.componentsBuilder.chart.update();
    self.componentsBuilder.chartLabel.update();
    self.componentsBuilder.topBorder.update();
    self.componentsBuilder.rightBorder.update();
    self.componentsBuilder.bottomBorder.update();
    self.componentsBuilder.leftBorder.update();
  },

  /**
   * draw()
   */
  draw: function() {
    'use strict';
    var self = this;

    $('#macd-chart-container').css('width', ChartView.properties.chartWidth);

    for (var key in self.components) {

      // Link data
      if (self.componentsBuilder[key].linkData) {
        self.componentsBuilder[key].linkData();
      }

      // Enter loop
      if (self.componentsBuilder[key].enter) {
        self.componentsBuilder[key].enter();
      }

      // Update loop
      if (self.componentsBuilder[key].update) {
        self.componentsBuilder[key].update();
      }

      // Exit loop
      if (self.componentsBuilder[key].enter) {
        self.components[key].exit().remove();
      }
    }

    // Update MACD and DEA lines
    function plotMACD(type, color){
      var line = d3.svg.line()
        .x(function(d,i) { return self.data.x(i); })
        .y(function(d)   {
          return type === 'dea'? self.data.y2(d.dea): self.data.y2(d.macd); })
        .interpolate('linear');

      self.components.chart.select('path.' + type)
        .datum(MacdChart.data.stockLine)
        .attr('d', line)
        .attr('stroke', color)
        .attr('fill', 'none');
    }

    plotMACD('dea', '#d7db74');
    plotMACD('macd', '#25bcf1');
  },

  /**
   * updateLegends()
   */
  updateLegends: function() {
    var self = this;
    $('#macd-chart-legend .dif').text(ChartView.getStockLine()[ChartView.getStockLine().length-1].diff);
    $('#macd-chart-legend .dea').text(ChartView.getStockLine()[ChartView.getStockLine().length-1].dea);
    $('#macd-chart-legend .macd').text(ChartView.getStockLine()[ChartView.getStockLine().length-1].macd);
  },

  /**
   * componentsBuilder stores all chart components
   * Each component has an append (enter) and update method
   */
  componentsBuilder: {
    chart: {
      append: function() {
        MacdChart.components.chart = d3.select('#macd-chart')
        .append('svg:svg')
        .attr('class', 'chart')
        .on('mouseenter', function() {
            ChartView.showAllScrollbars();
         })
         .on('mouseleave', function() {
            ChartView.hideAllScrollbars();
         });
      },
      update: function() {
        var props = MacdChart.properties;
        var width = ChartView.getChartWidth() * ChartView.getZoomFactor();
        MacdChart.components.chart
        .attr('height', props.height)
        .attr('width', width)
        .select('svg')
        .attr('width', width);
      }
    },
    chartLabel: {
      append: function() {
        MacdChart.components.chartLabel = d3.select('#macd-chart-label')
        .append('svg:svg')
        .attr('class', 'chart');
      },
      update: function() {
        var props = MacdChart.properties;
        MacdChart.components.chartLabel
        .attr('class', 'chart')
        .attr('width', ChartView.getContainerWidth())
        .attr('height', props.height-17)
        .select('svg').attr('width', ChartView.getContainerWidth());
      }
    },
    topBorder: {
      append: function() {
        MacdChart.components.topBorder = MacdChart.components.chartLabel.append('svg:line')
                                                  .attr('class', 'xborder-top-thick');
      },
      update: function() {
        MacdChart.components.topBorder
        .attr('x1', ChartView.properties.margin.left)
        .attr('x2', ChartView.properties.chartWidth + ChartView.properties.margin.left)
        .attr('y1', ChartView.properties.margin.top)
        .attr('y2', ChartView.properties.margin.top)
        .attr('stroke', 'rgb(77, 77, 77)')
        .attr('stroke-width', '2px');
      }
    },
    rightBorder: {
      append: function() {
        MacdChart.components.rightBorder = MacdChart.components.chartLabel.append('svg:line')
                                                    .attr('class', 'yborder-right');
      },
      update: function() {
        MacdChart.components.rightBorder
        .attr('x1', ChartView.properties.chartWidth + ChartView.properties.margin.left)
        .attr('x2', ChartView.properties.chartWidth + ChartView.properties.margin.left)
        .attr('y1', MacdChart.properties.chartHeight - ChartView.properties.margin.bottom)
        .attr('y2', ChartView.properties.margin.top)
        .attr('stroke', 'rgb(77, 77, 77)')
        .attr('stroke-width', '2px');
      }
    },
    bottomBorder: {
      append: function() {
        MacdChart.components.bottomBorder = MacdChart.components.chartLabel.append('svg:line')
                                                     .attr('class', 'xaxis');
      },
      update: function() {
        MacdChart.components.bottomBorder
        .attr('x1', ChartView.properties.margin.left)
        .attr('x2', ChartView.properties.width - ChartView.properties.margin.right)
        .attr('y1', MacdChart.properties.chartHeight - ChartView.properties.margin.bottom)
        .attr('y2', MacdChart.properties.chartHeight - ChartView.properties.margin.bottom)
        .attr('stroke', 'rgb(77, 77, 77)')
        .attr('stroke-width', '2px');
      }
    },
    leftBorder: {
      append: function() {
        MacdChart.components.leftBorder = MacdChart.components.chartLabel.append('svg:line')
                                                   .attr('class', 'yborder-left');

      },
      update: function() {
        MacdChart.components.leftBorder
        .attr('x1', ChartView.properties.margin.left)
        .attr('x2', ChartView.properties.margin.left)
        .attr('y1', MacdChart.properties.chartHeight - ChartView.properties.margin.bottom)
        .attr('y2', ChartView.properties.margin.top)
        .attr('stroke', 'rgb(77, 77, 77)')
        .attr('stroke-width', '2px');
      }
    },
    y1Labels: {
      append: function() {
        MacdChart.components.y1Labels = MacdChart.components.chartLabel.append('g')
                                                 .attr('class','y1labels').selectAll('text.y1rule');
      },
      linkData: function() {
        var data = ChartView.data.visibleStockLine.map(function(x) {return Math.abs((+x.diff));});
        var min = d3.max(data)*-1;
        var max = d3.max(data);
        MacdChart.components.y1Labels = MacdChart.components.y1Labels.data(MacdChart.helpers.getYLabelsData([max, min]));
      },
      enter: function() {
        MacdChart.components.y1Labels.enter().append('text').attr('class', 'y1rule');
      },
      update: function() {
        MacdChart.components.y1Labels
        .attr('x', ChartView.properties.margin.left - 15)
        .attr('y', MacdChart.data.y1)
        .attr('text-anchor', 'middle')
        .text(String);
      }
    },
    y2Labels: {
      append: function() {
        MacdChart.components.y2Labels = MacdChart.components.chartLabel.append('g')
                                                 .attr('class','y2labels').selectAll('text.y2rule');
      },
      linkData: function() {
        var data = ChartView.data.visibleStockLine.map(function(x) {return Math.abs((+x.macd));});
        var min = d3.max(data)*-1;
        var max = d3.max(data);
        MacdChart.components.y2Labels = MacdChart.components.y2Labels.data(MacdChart.helpers.getYLabelsData([max, min]));
      },
      enter: function() {
        MacdChart.components.y2Labels.enter().append('text').attr('class', 'y2rule');
      },
      update: function() {
        MacdChart.components.y2Labels
        .attr('x', ChartView.properties.width - ChartView.properties.margin.right + 15)
        .attr('y', MacdChart.data.y2)
        .attr('text-anchor', 'middle')
        .text(String);
      }
    },
    xLabels: {
      append: function() {
        MacdChart.components.xLabels = MacdChart.components.chart.append('g')
                                                .attr('class','xlabels').selectAll('text.xrule');
      },
      linkData: function() {
        MacdChart.components.xLabels = MacdChart.components.xLabels.data(ChartView.getXLabels());
      },
      enter: function() {
        MacdChart.components.xLabels.enter().append('svg:text').attr('class', 'xrule');
      },
      update: function() {
        MacdChart.components.xLabels
        .attr('x', function(d,i){ return MacdChart.data.x(d.rdate); })
        .attr('y', MacdChart.properties.chartHeight-ChartView.properties.margin.bottom+15)
        .attr('text-anchor', 'middle')
        .text(function(d,i) {
          var today = new Date();
          if (ChartView.getChartWidth() - MacdChart.data.x(d.rdate) > 20 && MacdChart.data.x(d.rdate) > 20) {
            return Helper.toDate(d.rdate, 'yyyy/mm');
          } else {
            return '';
          }
        });
      }
    },
    bars: {
      append: function() {
        MacdChart.components.bars = MacdChart.components.chart.append('g')
                                                .attr('class', 'bars').selectAll('rect.bars');
      },
      linkData: function() {
        MacdChart.components.bars = MacdChart.components.bars.data(MacdChart.data.stockLine);
      },
      enter: function() {
        MacdChart.components.bars.enter().append('rect').attr('class','bars');
      },
      update: function() {
        MacdChart.components.bars
        .attr('x', function(d, i) { return MacdChart.data.x(i); })
        .attr('y', function(d) { return MacdChart.data.y1(max(+d.diff, 0)); })
        .attr('height', function(d) { return Math.abs(MacdChart.data.y1(+d.diff) - MacdChart.data.y1(0)); })
        .attr('width',function(d) { return 0.8 * MacdChart.properties.graphWidth/MacdChart.data.stockLine.length; })
        .attr('fill', function(d) { return +d.diff > 0 ? '#f65c4e' : '#3bbb57'; });
      }
    },
    scrollbarRail: {
      append: function() {
        MacdChart.components.scrollbarRail = MacdChart.components.chart
                                            .append('rect')
                                            .attr('class', 'scrollbar-rail')
                                            .attr('width', ChartView.properties.width-ChartView.getLeftMargin()-ChartView.getRightMargin())
                                            .attr('height', 30)
                                            .attr('x', 0)
                                            .attr('y', MacdChart.properties.height-55)
                                            .on('mouseenter', function() {
                                              ChartView.showAllScrollbars();
                                              ChartView.properties.mouseOverScrollbar = true;
                                            })
                                            .on('mouseleave', function() {
                                              var mChart = ChartView.properties.mouseOverChart;
                                              if(!mChart){
                                                ChartView.hideAllScrollbars();
                                                ChartView.properties.mouseOverScrollbar = false;
                                              }
                                            })
                                            .attr('fill-opacity', 0);
      },
      update: function() {
        MacdChart.components.scrollbarRail.attr('width', ChartView.properties.width-ChartView.getLeftMargin()-ChartView.getRightMargin());
      }
    },
    scrollBar: {
      append: function() {
        //because d3 drag requires data/datum to be valid
        MacdChart.components.scrollBar = MacdChart.components.chart.append('rect')
                                            .attr('class', 'scrollbar')
                                            .datum([])
                                            .attr('height', 7)
                                            .attr('rx', 4)
                                            .attr('ry', 4)
                                            .on('mouseenter', function(e) {
                                              if(ChartView.isZoomed()){
                                                ChartView.showAllScrollbars();
                                                ChartView.properties.mouseOverScrollbar = true;
                                              }
                                            })
                                            .on('mouseleave', function(e) {
                                              var mChart = ChartView.properties.mouseOverChart;
                                              if(!mChart){
                                                ChartView.hideAllScrollbars();
                                                ChartView.properties.mouseOverScrollbar = false;
                                              }
                                            })
                                            .style('fill', 'rgb(107, 107, 107)')
                                            .style('stroke-width', '20')
                                            .style('stroke', 'rgb(107, 107, 107)')
                                            .style('stroke-opacity', '0')
                                            .call(ChartView.scrollbarDragBehavior());
        ChartView.properties.mouseOverScrollbar = false;
        ChartView.properties.mouseOverChart     = false;
      },
      update: function() {
        MacdChart.components.scrollBar
        .attr('x', ChartView.getScrollbarPos())
        .attr('y', MacdChart.properties.height - 30)
        .attr('width', ChartView.getScrollbarWidth())
        .style('fill-opacity', ChartView.isZoomed()? 50:0);
      }
    },
    mouseOverlay: {
      append: function() {
        MacdChart.components.mouseOverlay = MacdChart.components.chart.append('rect')
        .attr('class','mouseover-overlay')
        .attr('fill', 'transparent')
        .attr('fill-opacity', 0)
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', MacdChart.properties.chartHeight - 25);

        if(!IE8){
          MacdChart.components.mouseOverlay
            .call(ChartView.zoomBehavior())
            .datum([])   //because d3 drag requires data/datum to be valid
            .call(ChartView.chartDragBehavior());
        }
      },
      update: function() {
        MacdChart.components.mouseOverlay
        .attr('width', MacdChart.properties.graphWidth)
        .on('mouseover', function(e){
          ChartView.mouseOverMouseOverlay();
          return Tooltip.show.macd();
        })
        .on('mouseout', function() {
          ChartView.mouseOutMouseOverlay();
          return Tooltip.hide.macd();
        })
        .on('mousemove', function() {
          Tooltip.show.macd();
          var xPos, yPos, mouseX, mouseY;

          if(IE8) {
      			xPos = event.offsetX;
      			yPos = event.offsetY; // because of the old browser info box on top
          }
          else {
            xPos = d3.mouse(this)[0];
            yPos = d3.mouse(this)[1];
          }

          var j = ChartView.xInverse(xPos, MacdChart.data.x);
          var d = MacdChart.data.stockLine[j];

          var offset = 10;
          mouseX = xPos + ChartView.getLeftMargin();

          var model = {
            top: yPos + 40,
            left: ChartView.getChartWidth() - xPos > 200 ? mouseX + offset : mouseX - 180 - offset,
            date: d.rdate,
            macd: d.macd,
            diff: d.diff,
            dea: d.dea
          };
          return Tooltip.render.macd(model);
        });
      }
    }
  },

  /**
   * Helper methods
   */
  helpers: {
    getRangeWithBuffer: function(min, max) {
      return [min - ((max - min)*0.5), max + ((max - min)*0.5)];
    },
    getYLabelsData: function(data) {
      var self = IndexChart;
      var max = d3.max(data);
      var min = d3.min(data);
      var labels = [];
      var diff = (max - min)/2;
      for (var i = 0; i < 3; i++) {
        labels.push(Math.floor(min + (i*diff)));
      }
      return labels;
    }
  }
};


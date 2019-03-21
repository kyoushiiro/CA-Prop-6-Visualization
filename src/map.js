/*
 *  Alfred Lam
 *  CMPS 161
 *  Prog 2
 *  map.js - reads in 5 csv files with data, merges them into 1 array, and displays the results in interactive
 *           ways using D3 and SVG elements.
 */

//Width and height
let w = 760;
let h = 600;

//Define map projection
let projection = d3.geoMercator()
             .center([ -120, 37 ])
             .translate([ w/2, h/2 ])
             .scale([ w*3.3 ]);

//Define path generator
let path = d3.geoPath()
         .projection(projection);

//Create SVG
let svg = d3.select("#container")
      .append("svg")
      .attr("width", w * 2)
      .attr("height", h)

let mainG = svg.append("g")

let linkG = svg.append("g")
    .attr("transform", "translate(800 0)")
    .attr("class", "noPointerEvents")
  .append("rect")
    .attr("width", 600)
    .attr("height", 500)
    .attr("x", 10)
    .attr("y", 10)
    .attr("fill", "gold")

console.log(mainG)

// Reference to our controls panel and legend svg in the HTML
let controls = d3.select("#container").select("#controls")
let legend = d3.select("#legend")

// Create scales to be used to visualize data. We do not know the domain until we read in data.
let gasConsumptionScale = d3.scaleSequential().interpolator(d3.interpolateOrRd)
let populationScale = d3.scalePow().range([20, 300]);
let partyScale = d3.scaleLinear().domain([50,100]).range([0.3,0.95])

// TODO
// Abstract out functions:
// ParseData()
// SetControls()
//   Toggle Ballot Results - YES(green) or NO(red), size = population, transparency = percentage that voted and won 
//   Set Political Affiliation - Red or blue, shade = percentage, based on governor elections
//   Set Gas Consumption       - Yellow to red, shade = higher gas consumption, gray = no data
//   Set Public Transportation - 
// DrawMap()

d3.csv("PopulationByCounty2017.csv").then(function(populationData) {
  d3.csv("GasByCounty2017Residential.csv").then(function(gasData) {
    d3.csv("BallotResults.csv").then(function(ballotData) {
      d3.csv("GovernorResults.csv").then(function(govData) {
        d3.json("cb_2017_us_county_5m.geojson").then(function(mapData) {

//Merge the data and GeoJSON
//Loop through once for each data value
for (let i = 0; i < gasData.length; i++) {
  //Grab state name
  let dataState = gasData[i].County;
  //Grab data value, and convert from string to float
  let gasValue = Math.max(0, parseFloat(gasData[i]["Total Usage"]));

  for (let k = 0; k < populationData.length; k++) {
    if(populationData[k].COUNTY.toUpperCase() == dataState) {
      let popValue = parseInt(populationData[k].POP2018.replace(/\,/g,''))

      for(let h = 0; h < ballotData.length; h++) {
        if(ballotData[h].COUNTY.toUpperCase() == dataState) {
          let yesValue = parseInt(ballotData[h].YES_COUNT.replace(/\,/g,''))
          let noValue = parseInt(ballotData[h].NO_COUNT.replace(/\,/g,''))

          for (let j = 0; j < mapData.features.length; j++) {
            let jsonState = mapData.features[j].properties.NAME;
            if (dataState == jsonState.toUpperCase()) {
              
              for(let g = 0; g < govData.length; g++) {
                if(govData[g].COUNTY_NAME.toUpperCase() == dataState) {
                  let demValue, repValue;
                  if(govData[g].PARTY_NAME == "Democratic") { demValue = parseFloat(govData[g].D_PERCENT.slice(0, -1)); repValue = 100-demValue; }
                  else { repValue = parseFloat(govData[g].D_PERCENT.slice(0, -1)); demValue = 100-repValue; }

                  mapData.features[j].properties.value = gasValue; // in millions of therms
                  mapData.features[j].properties.population = popValue;  // in people
                  mapData.features[j].properties.gasPerPop = gasValue * 1000000/popValue; // in therms
                  mapData.features[j].properties.yesCount = yesValue; // in votes
                  mapData.features[j].properties.noCount = noValue; // in votes
                  mapData.features[j].properties.dPercent = demValue;
                  mapData.features[j].properties.rPercent = repValue;
                  break;
                }
              }
              break;
            }
          }
          break;
        }
      }
      break;
    }
  }
} 
// Shows us our merged data for debugging purposes.
console.log(mapData);

// Calculate the domains of our scales, now that we have the data.
let gasMin = d3.min(mapData.features, function(d) { return d.properties.gasPerPop; })
let gasMax = d3.max(mapData.features, function(d) { return d.properties.gasPerPop; })
gasConsumptionScale.domain(d3.extent(mapData.features, function(d) { return d.properties.gasPerPop; }))
populationScale.domain(d3.extent(mapData.features, function(d) { return d.properties.population }))

// Create the legend for the gas consumption scale.
let gasLegendDomain = new Array() 
let increment = (gasMax - gasMin)/5;
for(let i = 1; i <= 5; i++) {
  gasLegendDomain.push(i * increment);
}

legend = legend.selectAll("g")
  .data(gasLegendDomain)
  .enter()
  .append("g")
  .attr("transform", "translate(10 35)")

legend.append("rect")
  .attr("x", 0)
  .attr("y", function(d, i) { return i * 22 })
  .attr("width", 15)
  .attr("height", 15)
  .style("fill", function(d) { return gasConsumptionScale(d) })

legend.append("text")
  .attr("x", 25)
  .attr("y", function(d, i) { return i * 22 + 11})
  .text(function(d, i) { return Math.round(gasLegendDomain[i]) })
  .attr("font-size", 14)

// Initialize the main map of California with tooltips giving detailed information per county.
let mainMap = mainG.selectAll("path")
  .data(mapData.features)
  .enter()
  .append("path")
    .attr("d", path)
    .style("fill", "#CCC")
    .on("mouseover", function(d){
      var xPosition = w/2 + 150;
      var yPosition = h/2;
      d3.select("#tooltip")
        .style("left", xPosition + "px")
        .style("top", yPosition + "px");
      d3.select("#county")
        .text(d.properties.NAME)
      d3.select("#gasData")
        .text(Math.round(d.properties.value))
      d3.select("#gasPerPop")
        .text(Math.round(d.properties.gasPerPop))
      d3.select("#yesCount")
        .text(d.properties.yesCount)
      d3.select("#noCount")
        .text(d.properties.noCount)
      d3.select("#popData")
        .text(d.properties.population)
      d3.select("#political")
        .text(function() {
          if(d.properties.dPercent > d.properties.rPercent) {
            return "Democratic: " + d.properties.dPercent + "%"
          }
          else {
            return "Republican: " + d.properties.rPercent + "%"
          }
        })
      d3.select("#tooltip")
        .classed("hidden", false)
    })
    .on("mouseout", function(){
      d3.select("#tooltip").classed("hidden", true);
    })

let circles = false;
// Set controls to swap between different visualizations
controls.select("#spawnCircles").on("click", function() {
  if(circles == true) {
    mainG.selectAll(".popCircles").transition().duration(1500).attr("r", 0)
    mainG.selectAll(".popCircles").transition().delay(1500).remove()
    circles = false;
    return;
  }
  
  circles = true
  mainG.selectAll("circle")
    .data(mapData.features)
    .enter()
    .append("circle")
    .attr("class", "popCircles noPointerEvents")
    .attr("cx", function(d) { return path.centroid(d)[0] })
    .attr("cy", function(d) { return path.centroid(d)[1] })
    .style("fill", "rgba(0,0,0,0)")
    .attr("r", 0)
    .transition()
    .duration(2000)
    .ease(d3.easeElasticOut)
    .style("fill", function(d) { 
      if(d.properties.yesCount > d.properties.noCount) { return ("rgba(0,100,0," + (1.0-d.properties.noCount/d.properties.yesCount + 0.2) + ")") } 
      else { return ("rgba(238,238,0," + (1.0-d.properties.yesCount/d.properties.noCount + 0.2) + ")") }
    })
    .attr("r", function(d) { if(d.properties.population >= 0) return Math.sqrt(populationScale(d.properties.population)) })
    .style("filter", "drop-shadow( 3px 3px 2px rgba(0, 0, 0, .7)")
})
.on("mouseover", function() {
  d3.select(this).select("rect").style("fill", "#bcdae5")
})
.on("mouseout", function() {
  d3.select(this).select("rect").style("fill", "#aec6cf")
})

controls.select("#setGasViz").on("click", function() {
  mainMap.transition().duration(1000)
    .style("fill", function(d) {
    //Get data value
    let value = d.properties.gasPerPop;
    if (value) {
      //If value exists…
      return gasConsumptionScale(value);
    } else {
      //If value is undefined…
      return "#CCC";
    }
  })
})
.on("mouseover", function() {
  d3.select(this).select("rect").style("fill", "#bcdae5")
})
.on("mouseout", function() {
  d3.select(this).select("rect").style("fill", "#aec6cf")
})

// Fire the click event to initalize Gas Visualization
eventFire(document.getElementById('setGasViz'), 'click');

controls.select("#setPartyViz").on("click", function() {
  mainMap.transition().duration(1000)
    .style("fill", function(d) {
      let demValue = d.properties.dPercent;
      let repValue = d.properties.rPercent;
      if(demValue && repValue) {
        if(demValue > repValue) {
          return "rgba(0,0,255," + partyScale(demValue) + ")";
        }
        else {
          return "rgba(255,0,0," + partyScale(repValue) + ")";
        }
      }
      else {
        return "#CCC"
      }
    })
})
.on("mouseover", function() {
  d3.select(this).select("rect").style("fill", "#bcdae5")
})
.on("mouseout", function() {
  d3.select(this).select("rect").style("fill", "#aec6cf")
})

// One pair of these for every data file we read.
        })
      })
    })
  })
})

//---- End of data reading ----//

// Fires a Javascript event, like click.
// Code from: https://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
function eventFire(el, etype){
  if (el.fireEvent) {
    el.fireEvent('on' + etype);
  } else {
    var evObj = document.createEvent('Events');
    evObj.initEvent(etype, true, false);
    el.dispatchEvent(evObj);
  }
}
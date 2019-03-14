/*
 *  Alfred Lam
 *  CMPS 161
 *  Prog 2
 *  map.js
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
      .attr("width", w)
      .attr("height", h);

// Reference to our controls panel in the HTML
let controls = d3.select("#container").select("#controls")

// Create scales to be used to visualize data. We do not know the domain until we read in data.
let gasConsumptionScale = d3.scaleSequential().interpolator(d3.interpolateOrRd)
let populationScale = d3.scaleLinear().range([4, 35]);

d3.csv("PopulationByCounty2017.csv").then(function(populationData) {
  d3.csv("GasByCounty2017Residential.csv").then(function(gasData) {
    d3.csv("BallotResults.csv").then(function(ballotData) {
      d3.json("cb_2017_us_county_5m.geojson").then(function(mapData) {
        // TODO
        // Abstract out functions:
        // ParseData()
        // SetControls()
        //   Toggle Ballot Results - YES or NO, size = percentage
        //   Toggle Population Viz - Transparent circles, size = population
        //   Set Political Affiliation - Red or blue, shade = percentage, based on governor elections
        //   Set Gas Consumption       - White to red, shade = higher gas consumption
        //   Set Public Transportation - 
        // DrawMap()

        //Merge the data and GeoJSON
        //Loop through once for each data value
        for (let i = 0; i < gasData.length; i++) {
          //Grab state name
          let dataState = gasData[i].County;
          //Grab data value, and convert from string to float
          let gasValue = parseFloat(gasData[i]["Total Usage"]);

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
                      mapData.features[j].properties.value = gasValue; // in millions of therms
                      mapData.features[j].properties.population = popValue;  // in people
                      mapData.features[j].properties.gasPerPop = gasValue * 1000000/popValue; // in therms
                      mapData.features[j].properties.yesCount = yesValue; // in votes
                      mapData.features[j].properties.noCount = noValue; // in votes
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
        let gasMin = d3.min(mapData.features, function(d) { return Math.max(d.properties.gasPerPop, 0); })
        let gasMax = d3.max(mapData.features, function(d) { return d.properties.gasPerPop; })
        gasConsumptionScale.domain([gasMin, gasMax])

        let popMin = d3.min(mapData.features, function(d) { return d.properties.population })
        let popMax = d3.max(mapData.features, function(d) { return d.properties.population })
        populationScale.domain([popMin, popMax])

        // Initialize the main map of California with tooltips giving detailed information per county.
        let mainMap = svg.selectAll("path")
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
              d3.select("#tooltip")
                .classed("hidden", false)
            })
            .on("mouseout", function(){
              d3.select("#tooltip").classed("hidden", true);
            })

        // Set controls to swap between different visualizations
        controls.select("#spawnCircles").on("click", function() {
          svg.selectAll("circle")
            .data(mapData.features)
            .enter()
            .append("circle")
            .attr("class", "noPointerEvents")
            .attr("cx", function(d) { return path.centroid(d)[0] })
            .attr("cy", function(d) { return path.centroid(d)[1] })
            .style("fill", "rgba(0,0,0,0)")
            .attr("r", 0)
            .transition()
            .duration(2000)
            .ease(d3.easeElasticOut)
            .style("fill", "rgba(255,255,255,0.75)")
            .attr("r", function(d) { return populationScale(d.properties.population) })
        })
        .on("mouseover", function() {
          d3.select(this).select("rect").style("fill", "rgba(0,185,0,1)")
        })
        .on("mouseout", function() {
          d3.select(this).select("rect").style("fill", "rgba(0, 155, 0, 1)")
        })

        controls.select("#setGasViz").on("click", function() {
          mainMap.transition().duration(2000)
            .style("fill", function(d) {
            //Get data value
            let value = d.properties.gasPerPop;
            if (value && value >= 0) {
              //If value exists…
              return gasConsumptionScale(value);
            } else {
              //If value is undefined…
              return "#CCC";
            }
          })
        })
        .on("mouseover", function() {
          d3.select(this).select("rect").style("fill", "rgba(0,185,0,1)")
        })
        .on("mouseout", function() {
          d3.select(this).select("rect").style("fill", "rgba(0, 155, 0, 1)")
        })
      
      // One pair of these for every data file we read.
      })
    })
  })
})

//---- End of data reading ----//
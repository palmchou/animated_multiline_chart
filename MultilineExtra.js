// set up margin
var margin = {top: 10, right: 100, bottom: 40, left: 80},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

// set up svg element and do translation
var g = d3.select(".svg-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// %Y for four-digit year representation
// %y for two-digit
var parseTime = d3.timeParse("%Y");

// time scaler for x-axis
// linear scaler for values in y-axis
var xScale = d3.scaleTime().range([0, width]),
    yScale = d3.scaleLinear().rangeRound([height, 0]),
    zScale = d3.scaleOrdinal(d3.schemeCategory32);

var line = d3.line()
    .curve(d3.curveBasis) // interpolate the curve
    .x(function (d) {
        return xScale(d.year);
    })
    .y(function (d) {
        return yScale(d.value);
    });


function tweenDashoffsetOn() {
    const l = this.getTotalLength(),
        i = d3.interpolateString("" + l, "0");
    return function (t) {
        return i(t);
    };
}

function tweenDashoffsetOff() {
    const l = this.getTotalLength(),
        i = d3.interpolateString("0", "" + l);
    return function (t) {
        return i(t);
    };
}

var default_show = {
    "Brazil": true,
    "China": true,
    "Russia": true,
    "India": true,
    "South Africa": true,
    "United States": true
};

d3.csv("EPC_2000_2010.csv",
    // function that parses "text" year to datetime object by using previous defined parseTime method
    // function (d) {
    //     d.year = parseTime(d.year);
    //     return d;
    // },
    function (error, data) {

        // -- COMMENTS --
        // Create an array of countryData objects each with its country name, and array of valuesData which is an object
        // with to fields: year and value.
        // -- COMMENTS --
        var years = data.columns.slice(1);

        var countries = data.map(function (row) {
            return {
                countryName: row.Country,
                values: years.map(function (year) {
                    return {year: parseTime(year), value: +row[year]};
                }),
                default_show: default_show[row.Country] === true
            };
        });

        // console.log(countries);

        // use extent to get min max values from given array
        xScale.domain(d3.extent(years, function (year) {
            return parseTime(year);
        }));

        yScale.domain([
            d3.min(countries, function (c) {
                return d3.min(c.values, function (values) {
                    return values.value;
                });
            }),
            d3.max(countries, function (c) {
                return d3.max(c.values, function (values) {
                    return values.value;
                });
            })
        ]);

        zScale.domain(countries.map(function (c) {
            return c.countryName;
        }));


        // Draw the grid lines first in order to make the value lines appear on the top of gird
        // reference: https://bl.ocks.org/d3noob/c506ac45617cf9ed39337f99f8511218
        // add the X grid lines
        g.append("g")
            .attr("class", "grid grid-x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale)
                .ticks(5)
                .tickSize(-height)
                .tickFormat("")
            );

        // add the Y grid lines
        g.append("g")
            .attr("class", "grid grid-y")
            .call(d3.axisLeft(yScale)
                .ticks(10)
                .tickSize(-width)
                .tickFormat("")
            );

        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(xScale))
            .append("text")
            .text("Year")
            // .attr("transform", "rotate(-90)")
            .attr("x", width)
            .attr("dx", "4em")
            .attr("dy", "0.8em")
            .attr("fill", "black")
            .style("text-anchor", "left")
            // .attr("font-weight", "bold")
            .attr("font-size", "12px");

        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(yScale))
            .append("text")
            .text("Million BTUs Per Person")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height / 2))
            .attr("dy", "-3em")
            .attr("fill", "black")
            .style("text-anchor", "middle")
            // .attr("font-weight", "bold")
            .attr("font-size", "12px");

        var country = g.selectAll(".country")
            .data(countries)
            .enter().append("g")
            .attr("class", "country")
            .attr("id", function (d) {
                return d.countryName.replace(" ", '_');
            });

        country.append("path")
            .attr("class", "line")
            .attr("d", function (d) {
                return line(d.values);
            })
            .attr("fill", "none")
            .style("stroke", function (d) {
                return zScale(d.countryName);
            });

        country.append("text")
            .datum(function (d) {
                return {name: d.countryName, value: d.values[d.values.length - 1], default_show: d.default_show};
            })
            .attr("transform", function (d) {
                return "translate(" + xScale(d.value.year) + "," + yScale(d.value.value) + ")";
            })
            .attr("x", 3)
            .attr("dy", "0.3em")
            .style("text-anchor", "start")
            .style("font", "12px sans-serif")
            .text(function (d) {
                return d.name;
            })
            .style('opacity', 0)
            .filter(function (d) {
                return d.default_show
            })
            .transition()
            .duration(2000)
            .style('opacity', 1);


        // add animation
        // setup dasharray attribute of each dash for later use of "offset" to do the animation
        function initDash() {
            d3.select(this)
                .attr("stroke-dasharray", this.getTotalLength() + "," + this.getTotalLength())
                .attr("stroke-dashoffset", "" + this.getTotalLength());
        }

        var paths = country.select("path").each(initDash);

        paths.filter(function (d) {
            return d.default_show;
        })
            .transition()
            .duration(2000)
            .attrTween("stroke-dashoffset", tweenDashoffsetOn);

        var checkboxes = d3.select(".country-list").selectAll(".country-checkbox")
            .data(countries)
            .enter()
            .append("li")
            .attr("class", "country-checkbox");

        function initCheckBox(d) {
            d3.select(this)
                .attr("checked", true);
        }

        checkboxes.append("input")
            .attr("type", "checkbox")
            .attr("id", function (d) {
                return d.countryName.replace(" ", '_') + '_checkbox';
            })
            .attr("data-country", function (d) {
                return d.countryName.replace(" ", '_')
            })
            .on("change", checkChanged)
            .filter(function (d) {
                return d.default_show;
            })
            .each(initCheckBox);

        checkboxes.append("label")
            .attr("for", function (d) {
                return d.countryName.replace(" ", '_') + '_checkbox';
            })
            .text(function (d) {
                return d.countryName;
            });
    });


// create country checkbox list

// d3.select("#myCheckbox").on("change", update);

function checkChanged() {
    console.log(this);
    var checked = this.checked;
    var country = this.getAttribute("data-country");
    console.log(country);
    g = d3.select("#" + country);
    if (!checked) {
        g.select("text")
            .transition()
            .duration(1000)
            .style("opacity", 0);
        g.select("path").transition()
            .duration(2000)
            .attrTween("stroke-dashoffset", tweenDashoffsetOff);

    } else {
        g.select("text")
            .transition()
            .duration(1000)
            .style('opacity', 1);
        g.select("path").transition()
            .duration(2000)
            .attrTween("stroke-dashoffset", tweenDashoffsetOn);

    }
}





var source = 0;	// current data source
var limit = 126;

// data sources
var sources = [
	{"name":"drvlone (tracts)", "data": "16740_trans_drvlone_sample.csv","col1":"t_drvloneCV","col2":"t_drvloneE"},
	{"name":"drvlone (regions)", "data": "16740_trans_drvlone_sample.csv","col1":"r_drvloneCV","col2":"r_drvloneE"},
	{"name":"transit (tracts)", "data": "16740_trans_transit_sample.csv","col1":"t_transitCV","col2":"t_transitE"},
	{"name":"transit (regions)", "data": "16740_trans_transit_sample.csv","col1":"r_transitCV","col2":"r_transitE"},
	{"name":"vehiclpp (tracts)", "data": "16740_trans_vehiclpp_sample.csv","col1":"t_vehiclppCV","col2":"t_vehiclppE"},
	{"name":"vehiclpp (regions)", "data": "16740_trans_vehiclpp_sample.csv","col1":"r_vehiclppCV","col2":"r_vehiclppE"},
	{"name":"avgrooms (tracts)", "data": "16740_hous_avgrooms_sample.csv","col1":"t_avgroomsCV","col2":"t_avgroomsE"},
	{"name":"avgrooms (regions)", "data": "16740_hous_avgrooms_sample.csv","col1":"r_avgroomsCV","col2":"r_avgroomsE"},
	{"name":"occupied (tracts)", "data": "16740_hous_occupied_sample.csv","col1":"t_occupiedCV","col2":"t_occupiedE"},
	{"name":"occupied (regions)", "data": "16740_hous_occupied_sample.csv","col1":"r_occupiedCV","col2":"r_occupiedE"}
];

var current_data = {};

var info = {
	"cv":0
};

function load_data(_source,callback){
	source = _source;
	d3.csv("../data/"+ sources[source].data, function(data){
		//console.log(data);
		data = remove_rows(data,"inf"); 	// remove rows with "inf" (infinity)
		data = data.slice(0,limit);			// confine to limit
		display_table(data,"table",40);		// display table
		//console.log(data);
		current_data = {"data":data,"col1":sources[source].col1,"col2":sources[source].col2};
		callback(data,sources[source].col1,sources[source].col2);
	});
}


// buttons for data sources
for (var i in sources){
	var html = '<p><button class="btn btn-sm data-btn" id="'+ i +'">'+ sources[i].name +'</button></p>'
	$(".sources").append(html);
	// add listener
	$("#"+ i ).on("mouseover",function(){
		load_data(this.id,update_data);
	})
}

var showCV = 1;
var showData = 1;


var options = '<div><button class="btn btn-sm data-btn" id="option_cv_hide">Hide CV</button></div>';
$(".options").append(options);
$("#option_cv_hide").on("click",function(){
	if (showCV) showCV = 0;
	else showCV = 1;
	console.log("showCV: "+showCV);
	update_data(current_data.data,current_data.col1,current_data.col2);
})



/* 
 *	SCATTERPLOT PROPERTIES 
 */

var margin = { top: 20, right: 20, bottom: 50, left: 50 },
	width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    boxW = 50, boxH = 50;

var svg = d3.select("#chart")
	.append("div")
		.classed("svg-container", true) //container class to make it responsive
	.append("svg")
		// responsive SVG needs these 2 attributes and no width and height attr
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("viewBox", "0 0 "+ width +" "+ height)
		.classed("svg-content-responsive", true); // class to make it responsive

var estimateGroup = svg.append("g");
var estimateGroup2 = svg.append("g");
var cvGroup = svg.append("g");

// create div for the tooltip
var tooltip = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0);




var sq = [18,10];
var str = "";

// create grid
function create_grid(data){

	for (var i in data){

		if (i % sq[0] == 0) {
			str += "\ncol "+ i;
		} else if (i > 0 && i % sq[0] !== 0) {
			str += "\t col "+ i +"\t";
		}
	}
	//console.log(str);
}
//create_grid(data);








/**
 *	D3 SCATTERPLOT
 *	x: census estimate
 *	y: CV
 */
function update_data(data,xCol,yCol){
	//console.log(JSON.stringify(data));


	// data fixing
	data.forEach(function(row,i) {
		//console.log(row);

		// the x column is the margin of error
		// so we create a high / low
		//data[i].min = parseFloat(row[yCol]) - parseFloat(row[xCol]);
		//data[i].max = parseFloat(row[yCol]) + parseFloat(row[xCol]);

		// clean numbers
		data[i][xCol] = Math.round(data[i][xCol] * 1000) / 1000;
		data[i][yCol] = Math.round(data[i][yCol] * 1000) / 1000;
	});
	//console.log(data)



	// set X min, max
	var xExtent = d3.extent(data, function(d){ return parseFloat(d[xCol]) });

	// scale xAxis data (domain/input) onto x range (output)
	var xScale = d3.scaleLinear()
		.domain(xExtent)
		.range([0,1]);

	console.log("xExtent: "+xExtent);
	console.log("xExtent (w/scale): "+ xScale(xExtent[0]),xScale(xExtent[1]));

	// set Y min, max
	var yExtent = d3.extent(data, function(d){ return d[yCol] });

	// function to map Y data (input) onto Y range (output)
	var yScale = d3.scaleLinear()
		.domain(yExtent)
		.range([0,1]); 
	
	//console.log("yExtent: "+yExtent);
	//console.log(yScale(yExtent[0]),yScale(yExtent[1]));




	// report xExtent/yExtent
	var html_out = "<b>RANGE OF VALUES</b>: ";
	html_out += xCol +" = "+ xExtent[0] +" -> "+ xExtent[1];
	html_out += " | "+ yCol +" = "+ yExtent[0] +" -> "+ yExtent[1];
	$("#report").html(html_out);



	/*
	 *	RECTANGLES
	 */

	var col = row = -1; // reset position

	// select points
	estimateGroup.selectAll("rect.box")
		.data(data).enter()
		.append("rect");

	estimateGroup.selectAll("rect")
			.attr("class", "box")
		.transition().duration(600)
			.attr("x", function(d,i){ 
				if (i % sq[0] === 0 ) col = 0;
				else col++;
				return col*boxW;
			})
			.attr("y", function(d,i){ 
				if (i % sq[0] === 0 ) row++;
				return row*boxH;
			})
			.attr("width", boxW)
			.attr("height", boxH)
			.attr("id", function(d,i){ return d[xCol]*4; })
			.style("fill", "black")
			.style("opacity", function(d,i){ return yScale(d[yCol]); }) // change color w/opacity;	



	/*
	 *	TEXT
	 */


	if (showData){
		var col = row = -1; // reset position	

		estimateGroup.selectAll("text.line1")
			.data(data).enter()
			.append("text");	

		estimateGroup.selectAll("text")
				.attr("class", "box-text line1")
			.transition().duration(600)
				.attr("x", function(d,i){ 
					if (i % sq[0] ===0 ) col = 0;
					else col++;
					return (col*boxW)+(boxW/2) ;
				})
				.attr("y", function(d,i){ 
					if (i % sq[0] === 0 ) row++;
					return (row*boxH)+(boxH/2)-4;
				})
				.text(function(d){
					var str = "";
					str += "CV: "+ d[xCol];
					return str;
				})

		var col = row = -1; // reset position	

		estimateGroup2.selectAll("text.line2")
			.data(data).enter()
			.append("text");	

		estimateGroup2.selectAll("text")
				.attr("class", "box-text line2")
			.transition().duration(600)
				.attr("x", function(d,i){ 
					if (i % sq[0] ===0 ) col = 0;
					else col++;
					return (col*boxW)+(boxW/2) ;
				})
				.attr("y", function(d,i){ 
					if (i % sq[0] === 0 ) row++;
					return (row*boxH)+(boxH/2)+7;
				})
				.text(function(d){
					var str = "";
					str += "E: "+ d[yCol];
					return str;
				})
	}



	// add interaction: show/hide tooltip
	estimateGroup.selectAll("rect.box")
		.on("mouseover", function(d) {
			//console.log(d3.select(this).attr("id")); // log id
			tooltip.transition().duration(200).style("opacity", 1); // show tooltip
			var text = xCol +": "+ d[xCol] +
					   "<br>"+ yCol +": "+ d[yCol] +
					   " ("+ (Math.round( yScale(d[yCol]) * 100) / 100) +" opacity)";
			tooltip.html(text)
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 40) + "px");
		})
		.on("mouseout", function(d) {
			tooltip.transition().duration(500).style("opacity", 0); 
		});



	/*
	 *	RED RECTANGLES (CV)
	 */

	if (showCV === 2){

		var col = row = -1; // reset position

		cvGroup.selectAll("rect.redbox")
			.data(data).enter()
			.append("rect");

		cvGroup.selectAll("rect")
				.attr("class", "redbox")
			.transition().duration(600)
				.attr("x", function(d,i){ 
					if (i % sq[0] ===0 ) col = 0;
					else col++;
					return col*boxW;
				})
				.attr("y", function(d,i){ 
					if (i % sq[0] === 0 ) row++;
					return row*boxH;
				})
				.attr("width", boxW)
				.attr("height", boxH)
				.attr("id", function(d,i){ return d[xCol]*4; })
				.style("fill", "rgba(255,0,0,1)")
				.style("opacity", function(d,i){ return xScale(d[xCol]); }) // change color w/opacity;	

		// add interaction: show/hide tooltip
		cvGroup.selectAll("rect.redbox")
			.on("mouseover", function(d) {
				//console.log(d3.select(this).attr("id")); // log id
				tooltip.transition().duration(200).style("opacity", 1); // show tooltip
				var text = xCol +": "+ d[xCol] +
						   "<br>"+ yCol +": "+ d[yCol] +
						   " ("+ (Math.round( yScale(d[yCol]) * 100) / 100) +" opacity)";
				tooltip.html(text)
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 40) + "px");
			})
			.on("mouseout", function(d) {
				tooltip.transition().duration(500).style("opacity", 0); 
			});
	}
}
//load_data(0,update_data);


var timer = setInterval(myTimer, 2000);
var r = 0;

function myTimer() {
	var d = new Date();
	console.log(d.toLocaleTimeString());
	//var r = Math.floor(Math.random()*sources.length);
	if (r == 0) r++;
	else r = 0;
	load_data(r,update_data);
}






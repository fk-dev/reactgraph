var React = require('react');
var Graph = require('./Graph.cs.jsx');

module.exports = React.createClass({
	getDefaultProps: function() {
		return {
			// general
			height: '500',		// defines the universe's height
			width: '500',		// defines the universe's width
			data: {series:[{ type : 'Bar', data : {series:[]}, axe : 'left', color: 'black'}], type: 'text'},
			title: '',
			titleFSize: 30,
			name: 'bars',
			// axis
				// label of axis
			xLabel: '',
			yLabel: '',
			xLabelFSize: 15,
			yLabelFSize: 15,
				// axis
			axis: undefined,	// left = (bottom,left), right = {top,right}, overrides x,y-axis
			xaxis: 'bottom',	// bottom || top
			yaxis: 'left',		// left || right
				// margins
			axisMargin: {l: 10, b: 10, r: 10, t: 10}, // left, bottom, right, top
			outerMargin: {},        // left, bottom, right, top
			// lower level descriptions
			axisProps: {},
		};
	},
	render: function(){
		// we imposed some stuff, whatever the user says
		var props = this.props;
		props.graphProps = [];
		props.data.type = 'text';
		props.ymin = 0.0; // a density [of probability] is always > 0
		props.name = this.props.name;
		if(!props.axisProps.tickProps){
			props.axisProps.tickProps = {};
			props.axisProps.tickProps.x = {};
			props.axisProps.tickProps.x.tickProps = {};
		}
		if(!props.axisProps.tickProps.x){
			props.axisProps.tickProps.x = {};
			props.axisProps.tickProps.x.tickProps = {};
		}
		if(!props.axisProps.tickProps.x.tickProps){
			props.axisProps.tickProps.x.tickProps = {};
		}
		props.axisProps.tickProps.x.tickProps.length = 0.0;
		props.axisProps.tickProps.x.tickProps.labelFSize = 15;
		// we provide some defaults
		for(var i = 0; i < this.props.data.series.length; i++){
			props.graphProps.push({
				color:     this.props.data.series[i].color     || 'black', 
				fill:      this.props.data.series[i].color     || 'black', 
				opacity:   this.props.data.series[i].opacity   || (1 - (0.8 * i /(props.data.series.length - 1))),  // from 1 to 0.2
				mark:      this.props.data.series[i].mark      || true, 
				markSize:  this.props.data.series[i].markSize  || 3, 
				markColor: this.props.data.series[i].markColor || this.props.data.series[i].color || 'black'
			});
		}
		return <Graph {...props}/>;
	}
});
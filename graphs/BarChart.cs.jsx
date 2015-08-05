var React = require('react');
var marker = require('../marks/marker.cs.jsx');
var Bar = require('./Bar.cs.jsx');
var _ = require('underscore');

module.exports = React.createClass({
  getDefaultProps: function() {
	 return {
		dsx: {}, // see space-mgr for details
		dsy: {}, // see space-mgr for details
		color:'none',
		stroke: 'none',
		strokeWidth: 0,
		span:0.5, // in dataSpace
		dir:90,
		points: [],
		drops: [],
		mark: true,
		markType: 'dot',
		markProps: {}
	 };
  },
  render : function() {

	var props = {
		dsx: this.props.dsx,
		dsy:  this.props.dsy,
		color: this.props.color,
		stroke:  this.props.stroke,
		strokeWidth:  this.props.strokeWidth,
		span: this.props.span,
		dir: this.props.dir
	};

	var bars = [];
	var dropsx = (this.props.drops.x.length === 0)?_.map(this.props.points,function(/*point*/){return 0.0;}):this.props.drops.x;
	var dropsy = (this.props.drops.y.length === 0)?_.map(this.props.points,function(/*point*/){return 0.0;}):this.props.drops.y;
	var drops = _.map(dropsx,function(xd,index){return {x:xd, y:dropsy[index]};});
	for(var i = 0; i < this.props.points.length; i++){
		var key = this.props.key + '.b' + i;
		bars.push(<Bar key={key} x={this.props.points[i].x} y={this.props.points[i].y} drop={drops[i]} {...props}/>);
	}

	 return <g>{bars}
			{marker.marks(this.props.points,this.props.markProps,this.props.mark,this.props.markType)}
			</g>;
  }
});

var React = require('react');
var marker = require('../marks/marker.cs.jsx');
var space = require('../core/space-transf.cs.js');
var _ = require('underscore');

module.exports = React.createClass({
	getDefaultProps: function(){
		return {
			stroke: 'black',
			strokeWidth: '1',
			fill: 'none',
			opacity: 1,
			mark: true,
			markType: 'dot',
			markProps: {},
			points: [],
         stairs: 'right',
			dsx: {}, // see space-mgr for details
			dsy: {}  // see space-mgr for details
		};
	},
	render: function(){

		var Nd = this.props.points.length;
		var dsx = this.props.dsx;
		var dsy = this.props.dsy;

		if(Nd < 2){
			throw 'stairs defined with less than 2 points!!';
		}

		var datas = [{x:0,y:0}]; // dealing with empty values
		if(this.props.points.length > 0){
			datas = _.map(this.props.points, function(point){
				return {
					x: space.toC(dsx,point.x), 
					y: space.toC(dsy,point.y)
				};}
			);
		}

		var dx = datas[1].x - datas[0].x;

		var data = '';
		switch(this.props.stairs){
			case 'right':
	// right stairs
				data = + datas[0].x + ',' + this.props.dsy.c.min + ' ';
				for(var i = 0; i < Nd - 1; i++){
					data += datas[i].x + ',' + datas[i].y + ' ' + datas[i+1].x + ',' + datas[i].y + ' ';
				}
				data += datas[Nd - 1].x + ',' + datas[Nd - 1].y + ' ' + (datas[Nd - 1].x + dx) + ',' + datas[Nd - 1].y; // last bin
				data += ' ' + (datas[Nd - 1].x + dx) + ',' + this.props.dsy.c.min; // closing
				break;
			case 'left':
   // left stairs
				data =(datas[0].x - dx) + ',' + this.props.dsx.c.min + ' ' + (datas[0].x - dx) + ',' + datas[0].y + ' ' + datas[0].x + ',' + datas[0].y + ' ';
				for(i = 0; i < Nd; i++){
					data +=  datas[i].x + ',' + datas[i+1].y + ' ' + ' ' + datas[i+1].x + ',' + datas[i+1].y + ' ';
				}
				data += data[Nd - 1].x  + ',' +  this.props.dsy.c.min; // closing
				break;
			default:
				throw 'Stairs are either right or left';
		}

      var marks = marker.marks(datas,this.props.markProps,this.props.mark,this.props.markType);


		return <g>
					<polyline points={data} stroke={this.props.stroke} strokeWidth={this.props.strokeWidth} fill={this.props.fill} opacity={this.props.opacity}/>
					<g>{marks}</g>
				</g>;
}
});
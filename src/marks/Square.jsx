import React from 'react';
import { toC } from '../core/space-transf.js';
import { isEqual } from '../core/im-utils.js';

/*
	{
		draw: false,
		ds: {
			x: {},
			y: {}
		},
		position:{
			x: 0,
			y: 0
		},
		color: 'black',
		width: 0,
		fill: null,
		size: 0,
		shade: 1
	}
*/

export default class SquareMark extends React.Component {

	shouldComponentUpdate(props){
		return !isEqual(props.state,this.props.state);
	}

	render(){
		const { css, gIdx, state, index } = this.props;
		const { ds, position, size, fill, color, shade, width} = state;

		const x = toC(ds.x,position.x) - size;
		const y = toC(ds.y,position.y) - size;
		const f = fill || color;

		const rectProps = css ? null : { width: 2 * size, height: 2 * size, fill: f, opacity: shade, stroke: color, strokeWidth: width };

		return <rect className={`mark mark-${gIdx}.${index}`} x={x} y={y} {...rectProps}/>;
	}
}

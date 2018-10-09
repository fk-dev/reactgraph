import React from 'react';

import { toC }     from '../core/space-transf.js';
import { isEqual } from '../core/im-utils.js';
import { isNil }   from '../core/utils.js';

/*
	{
		ds: {x: , y:},
		position: {x: , y:},
		label: '',
		FSize: ,
		offset: {x, y},
		anchor: '',
		color: '',
		dir: {x, y},
		rotate: true || false,
		transform: true || false
	},
*/

export default class Label extends React.Component {

	shouldComponentUpdate(props){
		return !isEqual(props.state,this.props.state);
	}

	power(label, labProps, props){
		const { base, power } = label;
		return <text {...props} {...labProps}>
			<tspan>{base}</tspan>
			{ power !== 0 ? <tspan>&#183;10</tspan> : null }
			{ power !== 0 ? <tspan dy={-0.5 * labProps.fontSize}>{power}</tspan> : null }
		</text>;
	}

	render(){

		if(this.props.state.label.length === 0){
			return null;
		}

// label
		// => theta = arctan(y/x) [-90,90]

		const { transform, ds, position, offset, rotate, angle, dir, color, FSize, anchor, label, howToRotate } = this.props.state;

		const xL = ( transform ? toC(ds.x,position.x) : position.x ) + offset.x;
		const yL = ( transform ? toC(ds.y,position.y) : position.y ) + offset.y;

		const theta = isNil(angle) ? rotate ? Math.floor( Math.atan( - Math.sqrt( dir.y / dir.x ) ) * 180 / Math.PI ) : 0 : angle; // in degrees

		const rotation = 'rotate(' + theta + ' ' + xL + ' ' + yL + ')';

		const labProps = this.props.css ? null :
			{
				fill: color,
				fontSize: FSize
			};

		const rotateAnchor = theta * howToRotate;

		const props = {
			className: this.props.className,
			x: xL,
			y: yL,
			transform: rotation,
			textAnchor: rotateAnchor  > 0 ? 'start' : rotateAnchor < 0 ? 'end' : anchor
		};

		return typeof label === 'string' ? <text {...props} {...labProps}>
			{label}</text> : this.power(label,labProps, props);
	}
}

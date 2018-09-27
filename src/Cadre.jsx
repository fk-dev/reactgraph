import React from 'react';
import { isEqual } from './core/im-utils.js';

export default class Cadre extends React.Component {

	shouldComponentUpdate(props){
		return !isEqual(props.width,this.props.width) || !isEqual(props.height,this.props.height);
	}

	render(){
		return <rect width={this.props.width} height={this.props.height} strokeWidth='1' stroke='black' fill='none' x='0' y='0'/>;
	}
}

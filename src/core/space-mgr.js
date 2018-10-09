/*
 * Responsible for making the ds object:
 *
 * ds is { c : {min, max}, d: {min,max}}
 */
import { find, flatten, map, extend, filter, pluck } from 'underscore';
import * as utils     from './utils.js';
import { defMargins } from './proprieties.js';
import { errorMgr }   from './errorMgr.js';

/* universe is {width , height}, this
 * is the total size of the svg picture.
 * The goal here is to compute the
 * world, i.e. the printed area
 *
 *				width
 * <------------------------>
 *  ________________________
 * |                        | ^
 * |   title/top axis       | |
 * |    ________________    | |
 * |   |                |   | |
 * |   |                |   | |
 * | 1 |                | 2 | |
 * |   |     WORLD      |   | | height
 * |   |                |   | |
 * |   |                |   | |
 * |   |________________|   | |
 * |                        | |
 * |   bottom axis          | |
 * |________________________| |
 *										^
 * 1 - left axis
 * 2 - right axis
 *
 *
 */

/*
 * We need to know some stuff to compute the margins:
 *
 *
 * title = {
 *  title: '', 
 *  titleFSize: 30
 * } if given
 *
 * universe = in coordinate space, length
 * 
 * borders = {
 *  axis: [{label: '', labelFSize: 15, placement: left}],
 *  marginsO: {l: 0,  r: 0}, 
 *  marginsI: {l: 10, r: 10},
 *  min: ,
 *  max:
 * } or
 * borders = {
 *  axis: [{label: '', labelFSize: 15, placement: bottom}],
 *  marginsO: {t: 0,  b: 0}, 
 *  marginsI: {t: 10, b: 10},
 *  min: ,
 *  max:
 * }
 *
 * marginsO is for the outer margin, it overrides any
 * computations of them du to title and axis definitions.
 * marginsI are the inner margins we add to the world to
 * have a more aesthetic view.
 *
 * If no marginsO are defined, here are the rules:
 *  - ticks and ticks labels are 20 px in the y dir (height of text),
 *			40 px in the x dir (length of text).
 *  - we take a 10px margin on title and labels
 *  - bottom and right margin:
 *			- 20px + ({x,y}LabelFSize + 10 px) if a {x,y}Label is defined,
 *  - top and left margin:
 *			- 20px + ({x,y}LabelFSize	+ 10 px) if a {x,y}Label is defined,
 *  - top margin takes a titleFSize + 10px more if a title is defined
 *
 * Then the data space is extended to the inner margin values,
 * then the data space can be even more extended to reach round values.
 *
 *	datas: {series:[{x:0, y:0}], stacked:'y', type:{ abs: 'number', ord: 'number'}], //
 *
 *
 * the cs/ds correspondance is found with:
 *    universe - marginsO - marginsI = datas
 */
const space = function(datas,universe,borders,title, exData){
		// if no data, we don't waste time
		if(datas.length === 0){
			return null;
		}

		// quick utils
		const ifNil = (a,b) => utils.isNil(a) ? b : a;

		// get the (right,left) or (top,bottom)
		let places = [];
		for(let p in borders.marginsO){
			places.push(p);
		}

		// axis/ticks label
		let relO = {};
		for(let idx = 0; idx < borders.axis.length; idx++){
			const w = borders.axis[idx].placement; 
			let s = borders.axis[idx].label.length > 0 ? 1 : 0;
			s += borders.axis[idx].ticks.major.show || borders.axis[idx].ticks.minor.show ? 1 : 0;
			relO[w] = s === 0 ? defMargins.outer.min :
				s === 1 ? Number(universe) * 0.15 : Number(universe) * 0.2;
		}

	// 1 - the coordinate space

		// compute the world
		// universe-world margins
		// min and max of coord space
		// margins between borders and axis
		let margins = {};
		for(let p = 0; p < places.length; p++){
			margins[places[p]] = defMargins.min;
		}

		// fetch the margin (label + ticks + default) for an axis
		let bigMargin = (axis) => {
			if(!axis.show){
				return defMargins.outer.min;
			}
			let marg = defMargins.outer.label[axis.placement];
			if(!axis.empty){
				marg += defMargins.outer.ticks[axis.placement];
			}
			if(axis.label.length !== 0){
				marg += ( axis.labelFSize + defMargins.outer.label.mar );
			}
			return marg;
		};

		const smallMargin = (axis) => {
			if(!axis.show){
				return 0;
			}
			return relO[axis.placement];
		};

		const margin = (axis) => Math.min(smallMargin(axis),bigMargin(axis));

		// labels
		for(let l = 0; l < borders.axis.length; l++){
			const key = borders.axis[l].placement;
			margins[key] = Math.max(margins[key],margin(borders.axis[l])); 
		}

		// title is at the top
		if(!utils.isNil(margins.top) && !utils.isNil(title)){
			margins.top += title.title.length !== 0 ? title.titleFSize + defMargins.title : 0;
		}

		// more suppleness, but less
		// efficiencies: automatic
		// margins computed whatever
		// happens, overwrite here
		// if defined
		for(let p = 0; p < places.length; p++){
			const k = places[p];
			// overwrite
			if(!utils.isNil(borders.marginsO[k])){
				margins[k] = Math.max(defMargins.outer.min,borders.marginsO[k]);
			// label ?
			}else if(!utils.isNil(borders.labels[k])){
				margins[k] = Math.max(defMargins.outer.min,borders.labels[k]);
			// default computations
			}else{
				margins[k] = Math.max(margins[k],defMargins.outer.min);
			}
		}

		for(let om in {bottom: true, top: true, left: true, right: true}){
			if(margins[om]){
				const axis = find(borders.axis, ax => ax.placement === om);
				if(axis){
					let marLength = margins[om];
					if(axis.label.length > 0){
						axis.labelFSize = Math.min(axis.labelFSize, 0.48 * marLength);
						axis.marginOff = 0.52 * marLength;
						marLength /= 2;
					}
					for(let ti in {major: true, minor: true}){
						const ticks = axis.ticks[ti];
						if(!ticks.show){
							continue;
						}
						ticks.labelFSize = Math.min(ticks.labelFSize, 0.68 * marLength);
						ticks.length = ticks.out !== 0 ? Math.min(ticks.length, 0.2 * marLength / ticks.out) : ticks.length;
						ticks.labelFMargin =  Math.min(marLength - ticks.labelFSize - ticks.length * ticks.out, 8); // no more that 8 pixels out
						if(borders.labels[om]){
							margins[om] += ticks.labelFMargin + ticks.labelFSize;
						}
					}
				}
			}
		}

		// we have the world's corners
		// the transformation between data space and the world space is
		// given by data space scaled to (world size - inner margins) and
		// placed at (origin.x.x + inner x margin, origin.y.y - inner y margin)
		let min, max;
		let rmin, rmax;
		if(utils.isNil(margins.left)){
			min = universe - margins.bottom;
			max = margins.top + ifNil(borders.marginsF.top, 0);
			rmin = min - ifNil(borders.marginsI.bottom, defMargins.inner.bottom );
			rmax = max + ifNil(borders.marginsI.top, defMargins.inner.top );
		}else{
			min = margins.left;
			max = universe - margins.right -  + ifNil(borders.marginsF.right,0);
			rmin = min + ifNil(borders.marginsI.left, defMargins.inner.left);
			rmax = max - ifNil(borders.marginsI.right, defMargins.inner.right);
		}

		const cWorld = {
			min: min,
			max: max
		};
		const posCWorld = {
			min: rmin,
			max: rmax
		};

	// 2 - the data space

		const allValues = flatten(datas);

		const mgr = allValues.length === 0 ? utils.mgr(exData) : utils.mgr(allValues[0]);

	// either data defined or explicitely defined
		const minVals = (vals) => {
			if(vals.length === 0){
				return null;
			}

			return mgr.min(vals);
		};

		const maxVals = (vals) => {
			if(vals.length === 0){
				return null;
			}

			return mgr.max(vals);
		};


		const bounds = {
			min: minVals(allValues),
			max: maxVals(allValues)
		};
		// empty graph
		if(!isFinite(bounds.min) || utils.isNil(bounds.min)){
			bounds.min = mgr.value(0);
		}
		if(!isFinite(bounds.max) || utils.isNil(bounds.max)){
			bounds.max = mgr.value(4);
		}

		// on augmente la distance totale
		const cRelMinMore = Math.abs( (cWorld.min - posCWorld.min) / (posCWorld.max - posCWorld.min) );
		const cRelMaxMore = Math.abs( (cWorld.max - posCWorld.max) / (posCWorld.max - posCWorld.min) );
		const dMinMore = mgr.multiply(mgr.distance(bounds.max,bounds.min),cRelMinMore);
		const dMaxMore = mgr.multiply(mgr.distance(bounds.max,bounds.min),cRelMaxMore);
		const dWorld = {
			min: mgr.subtract(bounds.min, dMinMore),
			max: mgr.add(bounds.max, dMaxMore)
		};

		// si imposé par l'utilisateur
		if(!utils.isNil(borders.min)){
			dWorld.min = borders.min;
		}
		if(!utils.isNil(borders.max)){
			dWorld.max = borders.max;
		}

		// on s'assure que ce sera toujours > 0, peu importe ce que dit l'user
		if(dWorld.min - dWorld.max === 0){
			dWorld.min = mgr.subtract(bounds.min, mgr.smallestStep());
			dWorld.max = mgr.add(bounds.max, mgr.smallestStep());
		}

/**
 * ds is { 
    c : {
      min, 
      max
    }, 
    d: {
      min,
      max
    }, 
    c2d , 
    d2c
  }
*/
		const fromCtoD = mgr.getValue( mgr.divide( mgr.distance( dWorld.max , dWorld.min ), cWorld.max - cWorld.min));
		return {
			c: {
				min: cWorld.min,
				max: cWorld.max,
			},
			d: {
				min: dWorld.min,
				max: dWorld.max,
			},
			d2c: 1 / fromCtoD,
			c2d: fromCtoD
		};

};

export function spaces(datas,universe,borders,title){

	const _filter = (datas,dir) => {
		return datas.map( serie => {
			// global characteristics
			let loff = serie.limitOffset;
			let limOfIdx = dir === 'y' || utils.isNil(loff) ? -1 : loff > 0 ? serie.series.length - 1: 0;
			return serie.series.map( (point,idx) => {
					// if label
					if(utils.isString(point[dir])){
						return idx;
					}
					let val = point[dir];

					// modifiers are span, drop and offset
					// offset changes the value
					if(!utils.isNil(point.offset) && !utils.isNil(point.offset[dir])){
						let mgr = utils.mgr(val);
						val = mgr.add(val,point.offset[dir]);
					}
					// drop adds a value
					if(!utils.isNil(point.drop) && !utils.isNil(point.drop[dir])){
						val = [val];
						val.push(point.drop[dir]);
					}

					// span makes value into two values,
					// we do it three, to keep the ref value
					if(!utils.isNil(point.span) && !utils.isNil(point.span[dir])){
						// beware, do we have a drop?
						val = utils.isArray(val) ? val : [val];
						let mm = utils.mgr(val[0]);
						val.push(mm.subtract(val[0],mm.divide(point.span[dir],2)));
						val.push(mm.add(val[0],mm.divide(point.span[dir],2)));
					}

					// limitOffset changes only one boundary
					if(limOfIdx === idx){
						if(utils.isArray(val)){
							val = map(val, (v) => v + loff);
						}else{
							val += loff;
						}
					}

					return val;
				}).concat(serie.phantomSeries.map( p => p[dir]));
			});
	};

	let ob = {right: 'ord', left: 'ord', top: 'abs', bottom: 'abs'};
	let dats = {};
	for(let w in ob){
		dats[w] = filter(datas,(series) => !!series[ob[w]] && series[ob[w]].axis === w);
	}

	let mins = {};
	let maxs = {};
	for(let w in ob){
		mins[w] = null;
		maxs[w] = null;
		for(let i = 0; i < borders[ob[w]].length; i++){
			if(borders[ob[w]][i].placement !== w){
				continue;
			}
			// min
			let mgr;
			if(!utils.isNil(borders[ob[w]][i].min)){
				mgr = utils.mgr(borders[ob[w]][i].min);
				if(utils.isNil(mins[w]) || mgr.lowerThan(borders[ob[w]][i].min,mins[w])){
					mins[w] = borders[ob[w]][i].min;
				}
			}
			// max
			if(!utils.isNil(borders[ob[w]][i].max)){
				mgr = utils.mgr(borders[ob[w]][i].max);
				if(utils.isNil(maxs[w]) || mgr.greaterThan(borders[ob[w]][i].max,maxs[w])){
					maxs[w] = borders[ob[w]][i].max;
				}
			}
		}
	}

	// worlds = (l,b), (l,t), (r,b), (r,t)
	let rights = _filter(dats.right,  'y');
	let lefts  = _filter(dats.left,   'y');
	let top    = _filter(dats.top,    'x');
	let bottom = _filter(dats.bottom, 'x');


	let border = {};
	border.ord = {
		marginsO: {top: borders.marginsO.top, bottom: borders.marginsO.bottom},
		marginsI: {top: borders.marginsI.top, bottom: borders.marginsI.bottom},
		marginsF: {top: borders.marginsF.top, bottom: borders.marginsF.bottom},
		labels:   {top: borders.labels.top,   bottom: borders.labels.bottom},
		axis: borders.abs
	};

	border.abs = {
		marginsO: {left: borders.marginsO.left, right: borders.marginsO.right},
		marginsI: {left: borders.marginsI.left, right: borders.marginsI.right},
		marginsF: {left: borders.marginsF.left, right: borders.marginsF.right},
		labels:   {left: borders.labels.left,   right: borders.labels.right},
		axis: borders.ord
	};

	let bor = {};
	for(let w in ob){
		// copy/expand
		bor[w] = extend(extend({},border[ob[w]]), {min: mins[w], max: maxs[w]});
	}

  let findType = (types, pl) => {
    let ty;
    for(let u = 0; u < types.length; u++){
      if(types[u].type && pl === types[u].axis){
        if(ty && ty !== 'error' && types[u].type !== ty){
          errorMgr(`Types of ${JSON.stringify(types)} are not consistent for axis at ${pl} placement! Check your props.`);
          ty = 'error';
        }else{
          ty = types[u].type;
        }
      }
    }
    // number in case of error or nothing
    return ty === 'date' ? new Date() : 5 ;
  };
	
  let typeData = {
    x: {
      bottom: findType(flatten(pluck(datas,'abs')), 'bottom'),
      top:    findType(flatten(pluck(datas,'abs')), 'top')
    },
    y: {
      left:  findType(flatten(pluck(datas,'ord')), 'left'),
      right: findType(flatten(pluck(datas,'ord')), 'right')
    }
  };

	return {
		y: {
			left:  space(lefts, universe.height,bor.left, title, typeData.y.left),
			right: space(rights,universe.height,bor.right,title, typeData.y.right)
		}, 
		x: {
			bottom: space(bottom,universe.width,bor.bottom, null, typeData.x.bottom),
			top:    space(top,   universe.width,bor.top,    null, typeData.x.top)
		}
	};
}

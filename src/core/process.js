import { uniq, map, pluck, find, each } from 'underscore';
import { spaces } from './space-mgr.js';
import * as utils from './utils.js';
import * as gProps from './proprieties.js';
import { cadreVM, backgroundVM, foregroundVM, titleVM, axesVM, curvesVM } from './VMbuilder.js';
import { vm as legendVM } from './legendBuilder.jsx';
import * as gradientMgr from './gradient-mgr.js';

const preprocessAxis = function(props){


  const { css } = props;
	let def = {abs : 'bottom', ord: 'left'};
	// axisProps is an Array,
	// can be given as a non array
	// empty <==> ticks.major.show === false && ticks.minor.show === false
	if(props.axisProps){
		for(let u in props.axisProps){
			if(!Array.isArray(props.axisProps[u])){
				props.axisProps[u] = [props.axisProps[u]];
			}
			for(let ax = 0; ax < props.axisProps[u].length; ax++){
				let axe = props.axisProps[u][ax]; // too long
        axe.css = utils.isNil(axe.css) ? css : axe.css;
				if((ax === 0 && axe.placement) || ['left','bottom'].indexOf(axe.placement) !== -1){
					def[u] = axe.placement;
				}
				if(!axe.ticks){
					axe.ticks = {};
				}
				if(!axe.ticks.major){
					axe.ticks.major = {};
				}
				if(!axe.ticks.minor){
					axe.ticks.minor = {};
				}
				if(axe.empty){
					axe.ticks.major.show = false;
					axe.ticks.minor.show = false;
				}else{
					axe.ticks.major.css = utils.isNil(axe.ticks.major.css) ? axe.css : axe.ticks.major.css;
					axe.ticks.minor.css = utils.isNil(axe.ticks.minor.css) ? axe.css : axe.ticks.minor.css;
						// no major ticks
					if(axe.ticks.major.show === false){
							// no minor ticks
							if(axe.ticks.minor.show !== true){
								axe.empty = true;
							}
					}
				}
			}
		}
	}

	// axis depends on data,
	// where are they?
	const axis = {
		abs: props.data ? uniq(props.data.map( e => !utils.isNil(e.abs) && e.abs.axis ? e.abs.axis : def.abs)) : [def.abs],
		ord: props.data ? uniq(props.data.map( e => !utils.isNil(e.ord) && e.ord.axis ? e.ord.axis : def.ord)) : [def.ord],
	};

	// default
	if(axis.abs.length === 0){
		axis.abs.push('bottom');
	}
	if(axis.ord.length === 0){
		axis.ord.push('left');
	}

	return axis;

};

const postprocessAxis = function(props){

	const fetchBounds = (type,where) => {
		let serie = [];
		for (let id = 0; id < props.data.length; id++){
			let dataW = props.data[id][type] && props.data[id][type].axis ? props.data[id][type].axis :
				type === 'abs' ? 'bottom' : 'left';
			if(dataW === where){
				serie = serie.concat(pluck(props.data[id].series, type === 'abs' ? 'x' : 'y'));
			}
		}

		let mgr = utils.mgr(serie[0]);
		return {
			max: mgr.max(serie),
			min: mgr.min(serie),
			mgr
		};

	};

	const cores = (wa) => {
		switch(wa){
			case 'left':
			case 'right':
				return 'top';
			case 'top':
			case 'bottom':
				return 'right';
		}
	};

	/// common factor, should we add some margin?
	for(let ax in {abs: true, ord: true}){

		for(let ia = 0; ia < props.axisProps[ax].length; ia++){

			let axisProps = props.axisProps[ax][ia];

			if(axisProps.factor === 'auto'){
				const { max, min, mgr } = fetchBounds(ax,axisProps.placement);

				if(mgr.type === 'number'){
					axisProps.factor = mgr.autoFactor(max, min);
					if(axisProps.factor !== 1){
						const sax = cores(axisProps.placement);
						props.factorMargin[sax] = gProps.defMargins.outer.factor[sax];
					}
				}else{
					axisProps.factor = 1;
				}
			}else{
				axisProps.factor = axisProps.factor || 1;
			}
		}

	}

	// if css, all css to null becomes true
	if(props.css){

		const _walker = (obj,fct) => {
			if(obj && typeof obj === 'object'){
				fct(obj);
				for(let u in obj){
					_walker(obj[u],fct);
				}
			}
			if(Array.isArray(obj)){
				obj.forEach( sobj => _walker(sobj,fct));
			}
		};

		const toTrueIfNull = o => {
			if(o.css === null){
				o.css = true;
			}
		};

		_walker(props, toTrueIfNull);
	}

};

const retroComp = p => {

	if(p.title && typeof p.title === 'string'){
		p.titleProps = {};
		['title', 'titleFSize', 'titleRotate'].forEach( x => {
			p.titleProps[x] = p[x];
		});
	}

	return p;
};

export function defaultTheProps(props){

	let axis = preprocessAxis(props);

	// retro compatibility
		// title
	props = retroComp(props);

	// fill by default
	let fullprops = utils.deepCp(utils.deepCp({},gProps.Graph(axis)), props);

	postprocessAxis(fullprops);

	// default for pie !!!bad coding!!!, Pie should do it (how?)
	const noMark = (idx) => {
		fullprops.graphProps[idx].markType = 'pie';
		fullprops.graphProps[idx].mark = false;
		fullprops.data[idx].coordSys = 'polar';
	};

	if(find(props.data, (data) => data.type === 'Pie')){
		each(fullprops.axisProps.abs, (ax) => { ax.show = false; });
		each(fullprops.axisProps.ord, (ax) => { ax.show = false; });
		each(props.data, (d,idx) => d.type === 'Pie' ? noMark(idx) : null);
	}

	// data & graphProps
	let dataDef = gProps.defaults('data');
	for(let ng = 0; ng < fullprops.data.length; ng++){
		const gprops = gProps.defaults(props.data[ng].type || 'Plain');
		fullprops.data[ng] = utils.deepCp(dataDef(props.data[ng].series, axis, {abs: props.data[ng].abs, ord: props.data[ng].ord}), props.data[ng]);
		fullprops.graphProps[ng] = utils.deepCp(utils.deepCp({},gprops), props.graphProps[ng]);
	}

	fullprops.__defaulted = true;

	return fullprops;
}

const addDefaultDrop = function(serie, dir, ds, after){

	const fetchDs = (d) => ds[d].bottom ? ds[d].bottom :
			ds[d].top ? ds[d].top :
			ds[d].left ? ds[d].left :
			ds[d].right ? ds[d].right : null;

	const defZero = (point) => utils.isDate(point[dir]) ? new Date(0) : 0 ;

	const def = (point,locdir) => {
		const min = ds ? fetchDs(locdir).d.min : defZero(point);
		let raw = point;
		raw.drop[locdir] = utils.isNil(raw.drop[locdir]) ? min : raw.drop[locdir];

		return raw;
	};

	// if dir is specified, only this dir, if not, both
	return map(serie, (point) => dir ? def(point,dir) : after ? def(def(point,'x'), 'y') : point);
};

const copySerie = function(serie){

	return map(serie, (point,idx) => {
		const xstr = utils.isString(point.x);
		const ystr = utils.isString(point.y);
		let raw = {
			x: xstr ? idx : point.x,
			y: ystr ? idx : point.y,
			label: {
				x: xstr ? point.x : point.label && point.label.x ? point.label.x : null,
				y: ystr ? point.y : point.label && point.label.y ? point.label.y : null
			},
			drop: {
				x: ystr ? 0 : null,
				y: xstr ? 0 : null
			},
			tag: !utils.isNil(point.value) ? point.value + '' : // explicitely defined
				xstr ? xstr : ystr ? ystr : // it's a label
					'(' + point.x + ',' + point.y + ')' // the (x,y) coordinates
		};
		for(let u in point){
			if(u !== 'x' &&
				u !== 'y'  &&
				u !== 'label'){
				raw[u] = point[u];
			}
		}
		return raw;
	});
};

const validate = function(series,discard){

	for(let se = 0; se < series.length; se++){
		if(utils.isNil(series[se])){
			series[se] = [];
		}
		for(let p = 0; p < series[se].length; p++){
			const px = utils.isValidParam(series[se][p].x);
			const py = utils.isValidParam(series[se][p].y);
			const pv = utils.isValidParam(series[se][p].value);
			if(!pv && ( !px || !py ) ){
				if(!discard){
					return false;
				}
				series[se].splice(p,1);
				p--;
			}
		}
	}

	return true;

};

const addOffset = function(series,stacked){
	let xoffset = [];
	let yoffset = [];

	const span = (ser,idx) => ser.length > 1 ? idx === 0 ? Math.abs(ser[idx + 1] - ser[idx]) * 0.9:	// if first
		idx === ser.length - 1 ? Math.abs(ser[idx] - ser[idx - 1]) * 0.9 :	// if last
			Math.min(Math.abs(ser[idx] - ser[idx-1]),Math.abs(ser[idx+1] - ser[idx])) * 0.9 : // if in between
				0; // if no serie

	const ensure = (obj,prop) => {
		if(utils.isNil(obj[prop])){ 
			obj[prop] = {};
		}
	};

	const writeIfUndef = (obj,prop,val) => {
		if(utils.isNil(obj[prop])){
			obj[prop] = val;
		}
	};

	for(let i = 0 ; i < series.length; i++){

		each(series[i],(point) => {
			if(utils.isNil(point.offset)){
				point.offset = {};
			}
			point.offset.x = point.offset.x || null;
			point.offset.y = point.offset.y || null;
		});

		if(stacked[i]){ // stacked in direction 'stacked', 'x' and 'y' are accepted
			switch(stacked[i]){
				case 'x':
					// init xoffset
					if(xoffset.length === 0){
						xoffset = map(series[i], () => 0 );
					}else{
						if(xoffset.length !== series[i].length){
							throw new Error('Stacked data needs to be of same size (x dir)!!');
						}
					}
					// add, compute and update
					for(let j = 0; j < xoffset.length; j++){
						series[i][j].offset.x = xoffset[j];
						ensure(series[i][j],'drop');
						series[i][j].drop.x = 0;
						ensure(series[i][j],'span');
						writeIfUndef(series[i][j].span,'y',span(pluck(series[i],'y'),j));
						xoffset[j] += series[i][j].x;
					}
					break;
				case 'y':
						// init yoffset
					if(yoffset.length === 0){
						yoffset = map(series[i],function(/*point*/){return 0;});
					}else{
						if(yoffset.length !== series[i].length){
							throw new Error('Stacked data needs to be of same size (y dir)!!');
						}
					}
					// add, compute and update
					for(let k = 0; k < yoffset.length; k++){
						series[i][k].offset.y = yoffset[k];
						ensure(series[i][k],'drop');
						series[i][k].drop.y = 0;
						ensure(series[i][k],'span');
						writeIfUndef(series[i][k].span,'x',span(pluck(series[i],'x'),k));
						yoffset[k] += series[i][k].y;
					}
					break;
			}
		}
	}
};

const makeSpan = function(series,data){

	const spanSer = (barType) => {

		const makeOffset = (serie,n,s,sb) => {
			if(utils.isNil(serie.Span) || series[s].length === 0){
				return;
			}
			if(utils.isNil(serie.offset)){
				serie.offset = {};
			}

		const dir = barType[0] === 'y' ? 'y' : 'x';
		const othdir = dir === 'y' ? 'x' : 'y';

		const mgr = utils.mgr(series[s][0][dir]);
		const othmgr = utils.mgr(series[s][0][othdir]);

	// start[s] = x - span * n / 2 + sb * span => offset = (sb *	span	- span * n / 2 ) = span * (sb - n / 2 )
			serie.offset[dir] = mgr.multiply(serie.span, sb - (n - 1) / 2);
			if(utils.isNil(serie.offset[othdir])){
				serie.offset[othdir] = othmgr.step(0);
			}
			each(series[s], (point) => {
				point.span = point.span || {};
				point.span[dir] = serie.span;
				point.offset = point.offset || {};
				point.offset[dir] = serie.offset[dir];
				point.offset[othdir] = serie.offset[othdir];
			});
		};

		const spanDiv = (serie,n,idx,idxb) => {
			if(utils.isNil(serie.Span)){
				return;
			}
			const mgr = utils.mgr(serie.span);
			serie.span = mgr.divide(serie.span,n);
			makeOffset(serie,n,idx,idxb);
		};

		let n = 0;
		let out = [];
		let oidx = [];
		each(series, (serie,idx) => {
			if(data[idx].type === barType){
				out[idx] = serie.length ? spanify(serie, data[idx]) : {};
				oidx[idx] = n;
				n++;
			}
		});

		each(out, (serie,idx) => serie ? spanDiv(serie,n,idx,oidx[idx]) : null );
	};

	spanSer('Bars');
	spanSer('yBars');

	spanSer('bars');
	spanSer('ybars');

};

const spanify = function(serie,data){
	let out = {};
	if(utils.isNil(data.span) || data.span === 0){
		let d;
		const dir = (data.type[0] === 'y')?'y':'x';
		const mgr = utils.mgr(serie[0][dir]);

		for(let i = 1; i < serie.length; i++){
		const dd = mgr.distance(serie[i][dir],serie[i - 1][dir]);
			if(utils.isNil(d) || mgr.lowerThan(dd, d)){
				d = mgr.multiply(dd,0.99);
			}
		}
		out.span = d ? d : mgr.defaultSpan();
	}else{
		out.span = data.span;
	}
	out.Span = true;

	return out;
};

// if stairs, we need an offset
// at one boundary value
const offStairs = function(serie,gprops){
	if(serie.length < 2){
		return undefined;
	}

	if(!gprops.stairs || gprops.stairs === 'right'){
		return serie[serie.length - 1].x - serie[serie.length - 2].x;
	}else if(gprops.stairs === 'left'){
		return serie[0].x - serie[1].x;
	}else{
		return undefined;
	}
};

const processSync = (getNode, rawProps, mgrId, getMeasurer) => {

	const props = rawProps && rawProps.__defaulted ? rawProps : defaultTheProps(utils.deepCp({},rawProps));

	const raw = props.data.map( x => x.series);

	const acti = props.graphProps.map( (g,idx) => g.show ? idx : null).filter( l => !utils.isNil(l));

	const filterData = (series) => {
		let out = [];
		for(let i = 0; i < acti.length; i++){
			out.push(series[acti[i]]);
		}
		return out;
	};

	let state = {};
	let lOffset = [];

	// empty
	if(!validate(raw,props.discard)){

		state.series = map(props.data, (/*ser*/) => [] );

	}else{
			// data depening on serie, geographical data only
		state.series = raw.map( serie => copySerie(serie) );
			// offset from stacked
		addOffset(state.series, props.data.map( ser => ser.stacked ));
			// span and offset from Bars || yBars
		makeSpan(state.series, props.data.map( (ser,idx) => {return {type: ser.type, span: props.graphProps[idx].span};}));
			// offset from Stairs
		lOffset = props.data.map( (p,idx) => p.type === 'Stairs' ? offStairs(state.series[idx],props.graphProps[idx]) : null);

	}

		// so we have all the keywords
	const marginalize = mar => {
		for(let m in {left: true, right: true, bottom: true, top: true}){
			if(utils.isNil(mar[m])){
				mar[m] = null;
			}
		}

		return mar;
	};

		// axis data, min-max from series (computed in space-mgr)
	let abs = utils.isArray(props.axisProps.abs) ? props.axisProps.abs : [props.axisProps.abs];
	let ord = utils.isArray(props.axisProps.ord) ? props.axisProps.ord : [props.axisProps.ord];

	// let's look for labels given in the data
	each(props.data, (dat,idx) => {
		const locObDir = {x: 'abs', y: 'ord'};
		const ser = state.series[idx];
		for(let u in locObDir){
			const dir = locObDir[u];
			const locAxis = find(props.axisProps[dir], (ax) => ax.placement === dat[dir].axis);
			const mm = utils.mgr(ser[0]);
			for(let p = 0; p < ser.length; p++){
				const point = ser[p];
				if(point.label[u] && locAxis.tickLabels.findIndex( l => mm.equal(l.coord,point[u]) && l.label === point.label[u]) === -1 ){
					locAxis.tickLabels.push({coord: point[u], label: point.label[u]});
				}
			}
		}
	});

	const borders = {
		marginsO: marginalize(props.outerMargin),
		marginsF: marginalize(props.factorMargin),
		marginsI: marginalize(props.innerMargin),
	};

	// xmin, xmax...
	const obDir = {x: 'abs', y: 'ord'};
	const obMM = {min: true, max: true};
	for(let dir in obDir){
		for(let type in obMM){
		const tmp = dir + type; //xmin, xmax, ...
			if(!utils.isNil(props[tmp])){
				if(obDir[dir] === 'abs'){
          abs[0][type] = props[tmp];
        }else{
          ord[0][type] = props[tmp];
        }
			}
		}
	}

	// getting dsx and dsy

	// span and offet pointwise
	// drops if required and not given (default value)
	each(state.series, (serie,idx) => {
	let dir;
		switch(props.data[idx].type){
			case 'Bars':
			case 'bars':
				dir = 'y';
				break;
			case 'yBars':
			case 'ybars':
				dir = 'x';
				break;
			default:
				break;
		}
		addDefaultDrop(serie,dir);
	});

	const data = map(filterData(state.series),(ser,idx) => {
		return {
			series: ser,
			phantomSeries: props.data[idx].phantomSeries,
			stacked: props.data[idx].stacked,
			abs: props.data[idx].abs,
			ord: props.data[idx].ord,
			coordSys: props.data[idx].coordSys,
			limitOffset: lOffset[idx] ? lOffset[idx] : null,
		};
	});

	// empty
	if(data.length === 0){
		data[0] = gProps.defaults('data')([{x: 42, y: 42}], {abs: [], ord: []});
	}

	// space = {dsx, dsy}
	state.spaces = spaces({width: props.width, height: props.height}, data, {abs, ord}, borders, props.titleProps, getMeasurer());

	// defaut drops for those that don't have them
	state.series = map(state.series, (serie,idx) => {
	let dir, ds;
		switch(props.data[idx].type){
			case 'Bars':
			case 'bars':
				dir = 'y';
				ds = state.spaces;
				break;
			case 'yBars':
			case 'ybars':
				dir = 'x';
				ds = state.spaces;
				break;
			default:
				break;
		}

		if(props.data[idx].stacked){
			dir = props.data[idx].stacked;
		}
		if(!dir && props.graphProps[idx].process){
			dir = !props.graphProps[idx].process.dir || props.graphProps[idx].process.dir === 'x' ? 'y' : 'x';
		}
		return addDefaultDrop(serie,dir,ds,true);
	});

////


	//now to immutable VM
	let imVM = {
		width: props.width,
		height: props.height,
		axisOnTop: props.axisOnTop,
		css: props.css
	};

	// 1 - cadre
	imVM.cadre = cadreVM.create(() => getNode().cadre, { show: props.cadre.show, css: props.cadre.css, width: props.width, height: props.height});

	// 2 - background
	imVM.background = backgroundVM.create(() => getNode().background, { color: props.background.color, css: props.background.css, spaces: state.spaces, motherCss: props.css });

	// 3 - foreground
	imVM.foreground = foregroundVM.create(() => getNode().foreground, { foreground: props.foreground, spaces: state.spaces });

	// 4 - Title
	imVM.title = titleVM.create(() => getNode().title, { 
		title: props.titleProps.title,
		titleFSize: props.titleProps.titleFSize,
		css: props.titleProps.css,
		motherCss: props.css,
		width: props.width,
		height: getMeasurer().measureText(props.titleProps.title, props.titleProps.titleFSize, props.titleProps.css ? 'title' : null).height + getMeasurer().lengthes().title, // height + cadratin
		placement: 'top'
	});

	// 5 - Axes
	imVM.axes = axesVM.create(() => getNode().axes, { props, state, measurer: getMeasurer(), motherCss: props.css});

	// 6 - Curves
	imVM.curves = curvesVM.create(() => getNode().curves, { props, state, mgrId } );

	// 7 - legend
	imVM.legend = legendVM.create(() => getNode().legend, { props, mgrId } );

	// 8 - gradients
	imVM.gradient = gradientMgr.getGradientsPrinter(mgrId);

	return imVM;

};

export function process(getNode, rawProps, mgrId, getMeasurer, cb){
	if(utils.async()){
		setImmediate(() => cb(null,processSync(getNode, rawProps, mgrId, getMeasurer)));
	}else{
		cb(null,processSync(getNode, rawProps, mgrId, getMeasurer));
	}
}

const _processLegend = (getNode,rawProps, mgrId) => {
	let props = defaultTheProps(utils.deepCp({},rawProps));
	// data depening on serie, geographical data only
	props.data = map(props.data, (dat,idx) =>  {
		return {
		type: rawProps.data[idx].type,
		series: copySerie(dat.series)
		};
	});

	return legendVM.create(getNode, { props, mgrId });
};

export function processLegend(getNode,rawProps, mgrId, cb){

	return cb(null, _processLegend(getNode,rawProps, mgrId));

}

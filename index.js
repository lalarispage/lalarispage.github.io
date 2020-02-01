!function(global,factory){"object"==typeof exports&&"undefined"!=typeof module?factory(exports):"function"==typeof define&&define.amd?define(["exports"],factory):factory((global=global||self)["curve-interpolator"]={})}(this,(function(exports){"use strict";
/*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */var __assign=function(){return(__assign=Object.assign||function(t){for(var s,i=1,n=arguments.length;i<n;i++)for(var p in s=arguments[i])Object.prototype.hasOwnProperty.call(s,p)&&(t[p]=s[p]);return t}).apply(this,arguments)},EPS=Math.pow(2,-42);function cuberoot(x){var y=Math.pow(Math.abs(x),1/3);return x<0?-y:y}function getQuadRoots(a,b,c){if(Math.abs(a)<EPS)return Math.abs(b)<EPS?[]:[-c/b];var D=b*b-4*a*c;return Math.abs(D)<EPS?[-b/(2*a)]:D>0?[(-b+Math.sqrt(D))/(2*a),(-b-Math.sqrt(D))/(2*a)]:[]}function getCubicRoots(a,b,c,d){if(Math.abs(a)<EPS)return getQuadRoots(b,c,d);var roots,p=(3*a*c-b*b)/(3*a*a),q=(2*b*b*b-9*a*b*c+27*a*a*d)/(27*a*a*a);if(Math.abs(p)<EPS)roots=[cuberoot(-q)];else if(Math.abs(q)<EPS)roots=[0].concat(p<0?[Math.sqrt(-p),-Math.sqrt(-p)]:[]);else{var D=q*q/4+p*p*p/27;if(Math.abs(D)<EPS)roots=[-1.5*q/p,3*q/p];else if(D>0){roots=[(u=cuberoot(-q/2-Math.sqrt(D)))-p/(3*u)]}else{var u=2*Math.sqrt(-p/3),t=Math.acos(3*q/p/u)/3,k=2*Math.PI/3;roots=[u*Math.cos(t),u*Math.cos(t-k),u*Math.cos(t-2*k)]}}for(var i=0;i<roots.length;i++)roots[i]-=b/(3*a);return roots}function getCoefficients(v0,v1,v2,v3,v,tension){void 0===v&&(v=0),void 0===tension&&(tension=.5);var c=(1-tension)*(v2-v0)*.5,x=(1-tension)*(v3-v1)*.5;return[2*v1-2*v2+c+x,-3*v1+3*v2-2*c-x,c,v1-v]}function solveForT(t,tension,v0,v1,v2,v3){if(Math.abs(t)<EPS)return v1;if(Math.abs(1-t)<EPS)return v2;var t2=t*t,t3=t*t2,_a=getCoefficients(v0,v1,v2,v3,0,tension);return _a[0]*t3+_a[1]*t2+_a[2]*t+_a[3]}function getDerivativeOfT(t,tension,v0,v1,v2,v3){var t2=t*t,_a=getCoefficients(v0,v1,v2,v3,0,tension);return 3*_a[0]*t2+2*_a[1]*t+_a[2]}function distance(p1,p2){var dx=p2[0]-p1[0],dy=p2[1]-p1[1],squared=dx*dx+dy*dy;return Math.sqrt(squared)}function normalize(v){var l=Math.sqrt(v[0]*v[0]+v[1]*v[1]);return 0===l?[0,0]:(v[0]/=l,v[1]/=l,v)}function orthogonal(v){var x=-v[1];return v[1]=v[0],v[0]=x,v}function clamp(value,min,max){return void 0===min&&(min=0),void 0===max&&(max=1),value<min?min:value>max?max:value}function getPointAtT(t,points,tension,target,func){void 0===func&&(func=solveForT);var p=(points.length-1)*t,idx=Math.floor(p),weight=p-idx,p0=points[0===idx?idx:idx-1],p1=points[idx],p2=points[idx>points.length-2?points.length-1:idx+1],p3=points[idx>points.length-3?points.length-1:idx+2],x=func(weight,tension,p0[0],p1[0],p2[0],p3[0]),y=func(weight,tension,p0[1],p1[1],p2[1],p3[1]);return target?(target[0]=x,target[1]=y,target):[x,y]}function getTangentAtT(t,points,tension,target){return void 0===tension&&(tension=.5),1===tension&&0===t?t+=EPS:1===tension&&1===t&&(t-=EPS),getPointAtT(t,points,tension,target,getDerivativeOfT)}function getNormalAtT(t,points,tension,target){return void 0===tension&&(tension=.5),orthogonal(getTangentAtT(t,points,tension,target))}function getAngleAtT(t,points,tension){var tan=getTangentAtT(t,points,tension);return Math.atan2(tan[1],tan[0])}function getArcLengths(points,divisions,tension){void 0===tension&&(tension=.5);var current,lengths=[],last=getPointAtT(0,points,tension),sum=0;divisions=divisions||300,lengths.push(0);for(var p=1;p<=divisions;p++)sum+=distance(current=getPointAtT(p/divisions,points,tension),last),lengths.push(sum),last=current;return lengths}function getUtoTmapping(u,arcLengths){for(var comparison,il=arcLengths.length,targetArcLength=u*arcLengths[il-1],low=0,high=il-1,i=0;low<=high;)if((comparison=arcLengths[i=Math.floor(low+(high-low)/2)]-targetArcLength)<0)low=i+1;else{if(!(comparison>0)){high=i;break}high=i-1}if(arcLengths[i=high]===targetArcLength)return i/(il-1);var lengthBefore=arcLengths[i];return(i+(targetArcLength-lengthBefore)/(arcLengths[i+1]-lengthBefore))/(il-1)}function getTAtValue(lookup,tension,v0,v1,v2,v3){var _a=getCoefficients(v0,v1,v2,v3,lookup,tension),a=_a[0],b=_a[1],c=_a[2],d=_a[3];return 0===a&&0===b&&0===c&&0===d?[0]:getCubicRoots(a,b,c,d).filter((function(t){return t>-EPS&&t<=1+EPS})).map((function(t){return clamp(t,0,1)}))}function valuesLookup(lookup,points,options){for(var _a=__assign({axis:0,tension:.5,margin:.5,max:0,processXY:!1,func:solveForT},options),func=_a.func,axis=_a.axis,tension=_a.tension,margin=_a.margin,max=_a.max,processXY=_a.processXY,k=axis,l=k?0:1,solutions=new Set,i=1;i<points.length;i++){var idx=max<0?points.length-i:i,p1=points[idx-1],p2=points[idx],vmin=void 0,vmax=void 0;if(p1[k]<p2[k]?(vmin=p1[k],vmax=p2[k]):(vmin=p2[k],vmax=p1[k]),lookup-margin<=vmax&&lookup+margin>=vmin){var p0=points[idx-1==0?0:idx-2],p3=points[idx>points.length-2?points.length-1:idx+1],ts=getTAtValue(lookup,tension,p0[k],p1[k],p2[k],p3[k]);max<0?ts.sort((function(a,b){return b-a})):max>=0&&ts.sort((function(a,b){return a-b}));for(var j=0;j<ts.length;j++){var v=func(ts[j],tension,p0[l],p1[l],p2[l],p3[l],idx-1);if(processXY){var av=func(ts[j],tension,p0[k],p1[k],p2[k],p3[k],idx-1),pt=0===axis?[av,v]:[v,av];solutions.add(pt)}else solutions.add(v);if(solutions.size===Math.abs(max))return Array.from(solutions)}}}return Array.from(solutions)}function tangentsLookup(lookup,points,options){return valuesLookup(lookup,points,__assign(__assign({},options),{func:getDerivativeOfT,processXY:!0}))}function getBoundingBox(points,options){void 0===options&&(options={});for(var _a=__assign({tension:.5,from:0,to:1,arcLengths:null,arcDivisions:300},options),tension=_a.tension,u0=_a.from,u1=_a.to,arcLengths=_a.arcLengths,arcDivisions=_a.arcDivisions,t0=getUtoTmapping(u0,arcLengths=arcLengths||getArcLengths(points,arcDivisions,tension)),t1=getUtoTmapping(u1,arcLengths),i0=Math.floor((points.length-1)*t0),i1=Math.ceil((points.length-1)*t1),start=getPointAtT(t0,points,tension),end=getPointAtT(t1,points,tension),x1=Math.min(start[0],end[0]),x2=Math.max(start[0],end[0]),y1=Math.min(start[1],end[1]),y2=Math.max(start[1],end[1]),_loop_1=function(i){var p1=points[i-1],p2=points[i];i<i1&&(p2[0]<x1&&(x1=p2[0]),p2[0]>x2&&(x2=p2[0]),p2[1]<y1&&(y1=p2[1]),p2[1]>y2&&(y2=p2[1]));var w0=(points.length-1)*t0-(i-1),w1=(points.length-1)*t1-(i-1);if(tension<1){var p0_1=points[i-2<0?0:i-2],p3_1=points[i>points.length-2?points.length-1:i+1],_a=getCoefficients(p0_1[0],p1[0],p2[0],p3_1[0],0,tension),ax=_a[0],bx=_a[1],cx=_a[2],_b=getCoefficients(p0_1[1],p1[1],p2[1],p3_1[1],0,tension),ay=_b[0],by=_b[1],cy=_b[2],xroots=getQuadRoots(3*ax,2*bx,cx),yroots=getQuadRoots(3*ay,2*by,cy),valid=function(t){return t>-EPS&&t<=1+EPS&&(i-1!==i0||t>w0)&&(i!==i1||t<w1)};xroots.filter(valid).forEach((function(t){var x=solveForT(t,tension,p0_1[0],p1[0],p2[0],p3_1[0]);x<x1&&(x1=x),x>x2&&(x2=x)})),yroots.filter(valid).forEach((function(t){var y=solveForT(t,tension,p0_1[1],p1[1],p2[1],p3_1[1]);y<y1&&(y1=y),y>y2&&(y2=y)}))}},i=i0+1;i<=i1;i++)_loop_1(i);return{x1:x1,y1:y1,x2:x2,y2:y2}}var CurveInterpolator=function(){function CurveInterpolator(points,tension,arcDivisions){void 0===tension&&(tension=.5),void 0===arcDivisions&&(arcDivisions=300),this._cache={},this.tension=tension,this.arcDivisions=arcDivisions,this.points=points,this._lmargin=.5}return CurveInterpolator.prototype.getT=function(position){return getUtoTmapping(position,this.arcLengths)},CurveInterpolator.prototype.getPointAt=function(position,target){return getPointAtT(this.getT(position),this.points,this.tension,target)},CurveInterpolator.prototype.getTangentAt=function(position,target){return void 0===target&&(target=null),normalize(getTangentAtT(this.getT(position),this.points,this.tension,target))},CurveInterpolator.prototype.getNormalAt=function(position,target){return normalize(getNormalAtT(this.getT(position),this.points,this.tension,target))},CurveInterpolator.prototype.getAngleAt=function(position){return getAngleAtT(this.getT(position),this.points,this.tension)},CurveInterpolator.prototype.getBoundingBox=function(from,to){if(void 0===from&&(from=0),void 0===to&&(to=1),0===from&&1===to&&this._cache.bbox)return this._cache.bbox;var bbox=getBoundingBox(this.points,{tension:this.tension,from:from,to:to,arcLengths:this.arcLengths});return 0===from&&1===to&&(this._cache.bbox=bbox),bbox},CurveInterpolator.prototype.getPoints=function(samples,returnType,from,to){if(void 0===samples&&(samples=100),void 0===from&&(from=0),void 0===to&&(to=1),!(from<0||to>1||to<from)){for(var pts=[],d=0;d<=samples;d++){var u=0===from&&1===to?d/samples:from+d/samples*(to-from);pts.push(this.getPointAt(u,returnType&&new returnType))}return pts}},CurveInterpolator.prototype.x=function(y,max,margin){void 0===max&&(max=0),void 0===margin&&(margin=this._lmargin);var matches=valuesLookup(y,this.points,{axis:1,tension:this.tension,max:max,margin:margin});return 1===Math.abs(max)?matches[0]:matches},CurveInterpolator.prototype.y=function(x,max,margin){void 0===max&&(max=0),void 0===margin&&(margin=this._lmargin);var matches=valuesLookup(x,this.points,{axis:0,tension:this.tension,max:max,margin:margin});return 1===Math.abs(max)?matches[0]:matches},CurveInterpolator.prototype.invalidateCache=function(){var _this=this;return Object.keys(this._cache).forEach((function(key){delete _this._cache[key]})),this},Object.defineProperty(CurveInterpolator.prototype,"points",{get:function(){return this._points},set:function(pts){pts.length>0&&pts.length<4&&(pts=function(args){for(args.length<4&&args.unshift(args[0]);args.length<4;)args.push(args[args.length-1]);return args}(pts)),this.invalidateCache(),this._points=pts},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"tension",{get:function(){return this._tension},set:function(t){t!==this._tension&&(this.invalidateCache(),this._tension=t)},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"arcDivisions",{get:function(){return this._arcDivisions},set:function(n){n!==this._arcDivisions&&(this._arcDivisions=n,this.invalidateCache()),this._arcDivisions=n},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"arcLengths",{get:function(){if(this._cache.arcLengths)return this._cache.arcLengths;var arcLengths=getArcLengths(this.points,this.arcDivisions,this.tension);return this._cache.arcLengths=arcLengths,arcLengths},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"length",{get:function(){var lengths=this.arcLengths;return lengths[lengths.length-1]},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"minX",{get:function(){return this.getBoundingBox().x1},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"maxX",{get:function(){return this.getBoundingBox().x2},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"minY",{get:function(){return this.getBoundingBox().y1},enumerable:!0,configurable:!0}),Object.defineProperty(CurveInterpolator.prototype,"maxY",{get:function(){return this.getBoundingBox().y2},enumerable:!0,configurable:!0}),CurveInterpolator}(),Point=function(){function Point(x,y){void 0===x&&(x=0),void 0===y&&(y=0),this.x=x,this.y=y}return Object.defineProperty(Point.prototype,0,{get:function(){return this.x},set:function(x){this.x=x},enumerable:!0,configurable:!0}),Object.defineProperty(Point.prototype,1,{get:function(){return this.y},set:function(y){this.y=y},enumerable:!0,configurable:!0}),Point}();exports.CurveInterpolator=CurveInterpolator,exports.EPS=EPS,exports.Point=Point,exports.anglesLookup=function(lookup,points,options){return tangentsLookup(lookup,points,options).map((function(tan){return Math.atan2(tan[1],tan[0])}))},exports.clamp=clamp,exports.distance=distance,exports.getAngleAtT=getAngleAtT,exports.getArcLengths=getArcLengths,exports.getBoundingBox=getBoundingBox,exports.getCoefficients=getCoefficients,exports.getCubicRoots=getCubicRoots,exports.getDerivativeOfT=getDerivativeOfT,exports.getNormalAtT=getNormalAtT,exports.getPointAtT=getPointAtT,exports.getQuadRoots=getQuadRoots,exports.getTAtValue=getTAtValue,exports.getTangentAtT=getTangentAtT,exports.getTtoUmapping=function(t,arcLengths){if(0===t)return 0;if(1===t)return 1;var al=arcLengths.length-1,totalLength=arcLengths[al],tIdx=t*al,subIdx=Math.floor(tIdx),l1=arcLengths[subIdx];return tIdx===subIdx?l1/totalLength:(l1+(tIdx-subIdx)*(arcLengths[subIdx+1]-l1))/totalLength},exports.getUtoTmapping=getUtoTmapping,exports.normalize=normalize,exports.normalsLookup=function(lookup,points,options){return tangentsLookup(lookup,points,options).map((function(v){return orthogonal(v)}))},exports.orthogonal=orthogonal,exports.simplify=function(inputArr,maxOffset,maxDistance){var _a;if(void 0===maxOffset&&(maxOffset=.001),void 0===maxDistance&&(maxDistance=10),inputArr.length<=4)return inputArr;for(var _b=inputArr[0],o0=_b[0],o1=_b[1],arr=inputArr.map((function(d){return[d[0]-o0,d[1]-o1]})),_c=arr[0],a0=_c[0],a1=_c[1],sim=[inputArr[0]],i=1;i+1<arr.length;i++){var _d=arr[i],t0=_d[0],t1=_d[1],_e=arr[i+1],b0=_e[0],b1=_e[1];if(b0-t0!=0||b1-t1!=0){var proximity=Math.abs(a0*b1-a1*b0+b0*t1-b1*t0+a1*t0-a0*t1)/Math.sqrt(Math.pow(b0-a0,2)+Math.pow(b1-a1,2)),dir=[a0-t0,a1-t1],len=Math.sqrt(Math.pow(dir[0],2)+Math.pow(dir[1],2));(proximity>maxOffset||len>=maxDistance)&&(sim.push([t0+o0,t1+o1]),a0=(_a=[t0,t1])[0],a1=_a[1])}}var last=arr[arr.length-1];return sim.push([last[0]+o0,last[1]+o1]),sim},exports.solveForT=solveForT,exports.tangentsLookup=tangentsLookup,exports.valuesLookup=valuesLookup,Object.defineProperty(exports,"__esModule",{value:!0})}));
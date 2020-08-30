!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Nabla=e():t.Nabla=e()}(window,(function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var a=e[r]={i:r,l:!1,exports:{}};return t[r].call(a.exports,a,a.exports,n),a.l=!0,a.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var a in t)n.d(r,a,function(e){return t[e]}.bind(null,a));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=0)}([function(t,e,n){"use strict";n.r(e),n.d(e,"Canvas",(function(){return d})),n.d(e,"Canvas2D",(function(){return w})),n.d(e,"ImageIO",(function(){return a})),n.d(e,"Stream",(function(){return A})),n.d(e,"ArrayUtils",(function(){return T})),n.d(e,"Sort",(function(){return P})),n.d(e,"EditDistance",(function(){return L})),n.d(e,"Vector",(function(){return W})),n.d(e,"Pair",(function(){return Z})),n.d(e,"List",(function(){return ut}));var r={getImageCanvas:function(t){var e=document.createElement("canvas");e.width=t.width,e.height=t.height;var n=e.getContext("2d");return n.fillStyle="rgba(0, 0, 0, 0)",n.globalCompositeOperation="source-over",n.fillRect(0,0,e.width,e.height),n.drawImage(t,0,0),e},getDataFromImage:function(t){return canvas=r.getImageCanvas(t),canvas.getContext("2d").getImageData(0,0,t.width,t.height)},loadImage:function(t){var e=new Image;return e.src=t,e.isReady=!1,e.onload=function(){return e.isReady=!0},e},generateImageReadyPredicate:function(t){return function(){return t.isReady}}},a=r;function i(t,e){var n=[];return n[0]=t[0]+e[0],n[1]=t[1]+e[1],n}function o(t){var e=[];return e[0]=Math.floor(t[0]),e[1]=Math.floor(t[1]),e}function u(t,e){var n=[];return n[0]=t[0]-e[0],n[1]=t[1]-e[1],n}function c(t,e){return t[0]*e[0]+t[1]*e[1]}function s(t){return c(t,t)}function f(t){return Math.sqrt(c(t,t))}function h(t,e){var n=[];return n[0]=Math.min(t[0],e[0]),n[1]=Math.min(t[1],e[1]),n}function l(t,e){var n=[];return n[0]=Math.max(t[0],e[0]),n[1]=Math.max(t[1],e[1]),n}function p(t,e,n){var r=n[1]/t[1];return[r,(-t[0]*r+n[0])/e]}function v(t,e,n){var r=n[0]/t[0];return[r,(-t[1]*r+n[1])/e]}var g,y=function(t){this.canvas=t,this.ctx=t.getContext("2d"),this.image=this.ctx.getImageData(0,0,t.width,t.height),this.imageData=this.image.data};y.prototype.getSize=function(){return[this.canvas.height,this.canvas.width]},y.prototype.paintImage=function(){this.ctx.putImageData(this.image,0,0)},y.prototype.getCanvas=function(){return this.canvas},y.prototype.clearImage=function(t){this.useCanvasCtx((function(e){var n=e.getSize();e.ctx.fillStyle="rgba("+t[0]+","+t[1]+","+t[2]+","+t[3]+")",e.ctx.globalCompositeOperation="source-over",e.ctx.fillRect(0,0,n[1],n[0])}),!0)},y.prototype.useCanvasCtx=function(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];e||this.ctx.putImageData(this.image,0,0),t(this),this.image=this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height),this.imageData=this.image.data},y.prototype.getImageIndex=function(t){return 4*(this.canvas.width*t[0]+t[1])},y.prototype.getPxl=function(t){var e=this.getImageIndex(t);return[this.imageData[e],this.imageData[e+1],this.imageData[e+2],this.imageData[e+3]]},y.prototype.drawPxl=function(t,e){var n=this.getImageIndex(t);this.imageData[n]=e[0],this.imageData[n+1]=e[1],this.imageData[n+2]=e[2],this.imageData[n+3]=e[3]},y.prototype.drawLine=function(t,e,n){n.points=[t,e];var r=[];r.push(t),r.push(e);for(var a=[],i=[],o=0;o<r.length;o++){0<=(l=r[o])[0]&&l[0]<this.canvas.height&&0<=l[1]&&l[1]<this.canvas.width?a.push(l):i.push(l)}if(2!=a.length){var s=[],f=[e[0]-t[0],e[1]-t[1]];s.push(p(f,-(this.canvas.height-1),[-t[0],-t[1]])),s.push(v(f,-(this.canvas.width-1),[this.canvas.height-1-t[0],-t[1]])),s.push(p(f,this.canvas.height-1,[this.canvas.height-1-t[0],this.canvas.width-1-t[1]])),s.push(v(f,this.canvas.width-1,[-t[0],this.canvas.width-1-t[1]]));var h=[];for(o=0;o<s.length;o++){var l;0<=(l=s[o])[0]&&l[0]<=1&&0<=l[1]&&l[1]<=1&&h.push(l)}if(0!=h.length)if(a.length>0){var g=[t[0]+h[0][0]*f[0],t[1]+h[0][0]*f[1]];this.drawLineInt(a.pop(),g,n)}else{var y=[t[0]+h[0][0]*f[0],t[1]+h[0][0]*f[1]];for(o=1;o<h.length;o++){if(c(f=u(g=[t[0]+h[o][0]*f[0],t[1]+h[o][0]*f[1]],y),f)>.001)return void this.drawLineInt(y,g,n)}this.drawLineInt(y,y,n)}}else this.drawLineInt(a[0],a[1],n)},y.prototype.drawLineInt=function(t,e,n){t=o(t),e=o(e);var r=[-1,0,1],a=r.length,s=a*a,f=[];f[0]=t[0],f[1]=t[1];var h=u(e,t),l=[];for(l[0]=-h[1],l[1]=h[0],n(f,n.points,this);f[0]!==e[0]||f[1]!==e[1];){for(var p=Number.MAX_VALUE,v=[],g=0;g<s;g++){var y=r[g%a],d=r[Math.floor(g/a)],m=u(i(f,[y,d]),t),w=Math.abs(c(m,l))-c(m,h);p>w&&(p=w,v=[y,d])}n(f=i(f,v),n.points,this)}n(f,n.points,this)},y.prototype.drawPolygon=function(t,e){for(var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:y.isInsidePolygon,r=[[Number.MAX_VALUE,Number.MAX_VALUE],[Number.MIN_VALUE,Number.MIN_VALUE]],a=0;a<t.length;a++)r[0]=h(t[a],r[0]),r[1]=l(t[a],r[1]);var i=this.getSize(),c=u(i,[1,1]),s=[0,0];r[0]=o(h(c,l(s,r[0]))),r[1]=o(h(c,l(s,r[1])));for(var f=r[0][0];f<r[1][0];f++)for(var p=r[0][1];p<r[1][1];p++){var v=[f,p];n(v,t)&&e(v,t,this)}},y.prototype.drawTriangle=function(t,e,n,r){var a=[t,e,n];this.drawPolygon(a,r,y.isInsideConvex)},y.prototype.drawQuad=function(t,e,n,r,a){this.drawPolygon([t,e,n,r],a)},y.prototype.drawImage=function(t,e){"isReady"in t&&!t.isReady||this.useCanvasCtx((function(n){return n.ctx.drawImage(t,e[1],e[0])}))},y.prototype.drawCircle=function(t,e,n){var r=function(t,e){var n=[];return n[0]=t[0]*e,n[1]=t[1]*e,n}([1,1],e),a=[u(t,r),i(t,r)],c=this.getSize();a[0]=o(h(u(c,[1,1]),l([0,0],a[0]))),a[1]=o(h(u(c,[1,1]),l([0,0],a[1])));for(var s=a[0][0];s<=a[1][0];s++)for(var f=a[0][1];f<=a[1][1];f++){var p=[s,f];this.isInsideCircle(p,t,e)&&n(p,[t,e],this)}},y.prototype.isInsideCircle=function(t,e,n){return s(u(t,e))<=n*n},y.prototype.addEventListener=function(t,e,n){this.canvas.addEventListener(t,e,n)},y.prototype.drawString=function(t,e,n){this.useCanvasCtx((function(r){n(r.ctx),r.ctx.fillText(e,t[1],t[0])}))},y.isInsidePolygon=function(t,e){for(var n=[],r=0,a=e.length,i=0;i<a;i++)n[0]=u(e[(i+1)%a],t),n[1]=u(e[i],t),r+=Math.acos(c(n[0],n[1])/(f(n[0])*f(n[1])));return Math.abs(r-2*Math.PI)<.001},y.isInsideConvex=function(t,e){for(var n=e.length,r=[],a=[],i=0;i<n;i++){r[i]=u(e[(i+1)%n],e[i]);var o=[-r[i][1],r[i][0]],s=u(t,e[i]);a[i]=c(s,o)}var f=r[0][0]*r[1][1]-r[0][1]*r[1][0]>0?1:-1;for(i=0;i<n;i++){if(a[i]*f<0)return!1}return!0},y.simpleShader=function(t){return function(e,n,r){return r.drawPxl(e,t)}},y.colorShader=function(t){return y.interpolateTriangleShader((function(e,n,r,a){for(var i=[0,0,0,0],o=0;o<n.length;o++)i[0]=i[0]+t[o][0]*a[o],i[1]=i[1]+t[o][1]*a[o],i[2]=i[2]+t[o][2]*a[o],i[3]=i[3]+t[o][3]*a[o];r.drawPxl(e,i)}))},y.interpolateQuadShader=function(t){return function(e,n,r){var a=[n[0],n[1],n[2]],i=[n[2],n[3],n[0]],o=y.triangleBaryCoord(e,a);o[0]>0&&o[1]>0&&o[2]>0&&Math.abs(o[0]+o[1]+o[2]-1)<1e-10?t(e,n,r,[o[0],o[1],o[2],0]):(o=y.triangleBaryCoord(e,i),t(e,n,r,[o[2],0,o[0],o[1]]))}},y.interpolateTriangleShader=function(t){return function(e,n,r){alpha=y.triangleBaryCoord(e,n),t(e,n,r,alpha)}},y.interpolateLineShader=function(t){return function(e,n,r){var a=u(n[1],n[0]),i=u(e,n[0]),o=s(a),f=c(i,a);t(e,n,r,0==o?0:f/o)}},y.quadTextureShader=function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:y.bilinearInterpolation,r=null,c=function(c,s,f,p){t.isReady&&null!=r||(r=new y(a.getImageCanvas(t)));for(var v=r,g=v.getSize(),d=[0,0],m=0;m<e.length;m++)d[0]=d[0]+e[m][0]*p[m],d[1]=d[1]+e[m][1]*p[m];var w=[(1-d[1])*(g[1]-1),(g[0]-1)*d[0]],b=o(w=l([0,0],h(u([g[0],g[1]],[1,1]),w))),S=[v.getPxl(b),v.getPxl(i(b,[1,0])),v.getPxl(i(b,[1,1])),v.getPxl(i(b,[0,1]))],x=n(S,u(w,b));f.drawPxl(c,x)};return y.interpolateQuadShader(c)},y.triangleCache=(g=[],{constains:function(t){return null!=g[t%3]},get:function(t){return g[t%3]},set:function(t,e){return g[t%3]=e}}),y.triangleHash=function(t){return[t[0][0],t[1][0],t[2][0],t[0][1],t[1][1],t[2][1]].reduce((function(t,e){return 31*t+e}),1)},y.triangleBaryCoord=function(t,e){var n=y.triangleHash(e),r=[t[0]-e[0][0],t[1]-e[0][1]];if(!y.triangleCache.constains(n)){var a=[e[1][0]-e[0][0],e[1][1]-e[0][1]],i=[e[2][0]-e[0][0],e[2][1]-e[0][1]],o=a[0]*i[1]-a[1]*i[0];y.triangleCache.set(n,{triangle:e,u:a.map((function(t){return t/o})),v:i.map((function(t){return t/o})),det:o,hash:n})}var u=y.triangleCache.get(n),c=u.u,s=u.v;if(0==u.det)return[0,0,0];var f=[s[1]*r[0]-s[0]*r[1],c[0]*r[1]-c[1]*r[0]];return[1-f[0]-f[1],f[0],f[1]]},y.bilinearInterpolation=function(t,e){for(var n=[],r=0;r<t.length;r++){var a=t[0][r]+(t[3][r]-t[0][r])*e[1],i=a+(t[1][r]+(t[2][r]-t[1][r])*e[1]-a)*e[0];n.push(i)}return n},y.createCanvas=function(t,e){var n=document.createElement("canvas");return n.setAttribute("width",t[0]),n.setAttribute("height",t[1]),document.getElementById(e).appendChild(n),n};var d=y,m=function(t,e){if(d.call(this,t),2!=e.length||2!=e[0].length&&2!=e[1].length)throw"camera space must be 2-dim array with 2-dim arrays representing an interval";this.cameraSpace=e};(m.prototype=Object.create(d.prototype)).constructor=m,m.prototype.integerTransform=function(t){return[-(this.canvas.height-1)/(this.cameraSpace[1][1]-this.cameraSpace[1][0])*(t[1]-this.cameraSpace[1][1]),(this.canvas.width-1)/(this.cameraSpace[0][1]-this.cameraSpace[0][0])*(t[0]-this.cameraSpace[0][0])]},m.prototype.inverseTransform=function(t){return[this.cameraSpace[0][0]+(this.cameraSpace[0][1]-this.cameraSpace[0][0])/(this.canvas.width-1)*t[1],this.cameraSpace[1][1]-(this.cameraSpace[1][1]-this.cameraSpace[1][0])/(this.canvas.height-1)*t[0]]},m.prototype.drawLine=function(t,e,n){var r=this.integerTransform(t),a=this.integerTransform(e);d.prototype.drawLine.call(this,r,a,n)},m.prototype.drawTriangle=function(t,e,n,r){var a=this.integerTransform(t),i=this.integerTransform(e),o=this.integerTransform(n);d.prototype.drawTriangle.call(this,a,i,o,r)},m.prototype.drawQuad=function(t,e,n,r,a){var i=this.integerTransform(t),o=this.integerTransform(e),u=this.integerTransform(n),c=this.integerTransform(r);d.prototype.drawQuad.call(this,i,o,u,c,a)},m.prototype.drawCircle=function(t,e,n){var r=this.integerTransform(t),a=this.integerTransform([e,0])[1]-this.integerTransform([0,0])[1];d.prototype.drawCircle.call(this,r,a,n)},m.prototype.drawImage=function(t,e){d.prototype.drawImage.call(this,t,this.integerTransform(e))},m.prototype.drawString=function(t,e,n){var r=this.integerTransform(t);d.prototype.drawString.call(this,r,e,n)},m.prototype.setCamera=function(t){if(2!=t.length||2!=t[0].length&&2!=t[1].length)throw"camera space must be 2-dim array with 2-dim arrays representing an interval";this.cameraSpace=t};var w=m,b=function(t){this.f=t};b.prototype.compose=function(t){var e=this;return new b((function(n){return e.f(t(n))}))},b.prototype.leftCompose=function(t){var e=this;return new b((function(n){return t(e.f(n))}))},b.prototype.apply=function(t){return this.f(t)},b.prototype.get=function(){return this.f},b.of=function(t){return new b(t)};var S=b,x=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(t){return t},n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:function(t){return!0};this.gen=t,this.mapFunction=e,this.filterPredicate=n};x.prototype.state=function(){return this.gen.state},x.prototype.hasNext=function(){return this.gen.hasNext(this.filteredState())},x.prototype.filteredState=function(){for(var t=this.state();this.gen.hasNext(t)&&!this.filterPredicate(this.gen.peek(t));)t=this.gen.next(t);return t},x.prototype.head=function(){var t=this.filteredState();if(this.gen.hasNext(t))return this.gen.peek(t);throw"No head element exception"},x.prototype.tail=function(){return new x(x.generatorOf(this.gen.next(this.filteredState()),this.gen.next,this.gen.peek,this.gen.hasNext),this.mapFunction,this.filterPredicate)},x.prototype.map=function(t){return new x(this.gen,S.of(t).compose(this.mapFunction).get(),this.filterPredicate)},x.prototype.reduce=function(t,e){for(var n=this;n.hasNext();){var r=n.head();t=e(t,n.mapFunction(r)),n=n.tail()}return t},x.prototype.forEach=function(t){for(var e=this;e.hasNext();){var n=e.head();t(e.mapFunction(n)),e=e.tail()}},x.prototype.collect=function(t){return this.reduce(t.identity,t.reduce)},x.prototype.filter=function(t){var e=this;return new x(this.gen,this.mapFunction,(function(n){return e.filterPredicate(n)&&t(n)}))},x.prototype.take=function(t){return new x(x.generatorOf({i:0,stream:this},(function(t){return{i:t.i+1,stream:t.stream.tail()}}),(function(t){return t.stream.head()}),(function(e){return e.stream.hasNext()&&e.i<t})),this.mapFunction,this.filterPredicate).collect(x.Collectors.toArray())},x.prototype.takeWhile=function(t){return new x(x.generatorOf(this,(function(t){return t.tail()}),(function(t){return t.head()}),(function(e){return e.hasNext()&&t(e.head())})),this.mapFunction,this.filterPredicate).collect(x.Collectors.toArray())},x.prototype.zip=function(t){return new x(x.generatorOf([this,t],(function(t){return[t[0].tail(),t[1].tail()]}),(function(t){return[t[0].head(),t[1].head()]}),(function(t){return t[0].hasNext()&&t[1].hasNext()})))},x.prototype.flatMap=function(t){return new x(x.generatorOf({baseStream:this,flatStream:null},(function(e){if(!e.flatStream||!e.flatStream.hasNext()){var n=e.baseStream;return{baseStream:n.tail(),flatStream:t(n.head()).tail()}}return{baseStream:e.baseStream,flatStream:e.flatStream.tail()}}),(function(e){return e.flatStream&&e.flatStream.hasNext()?e.flatStream.head():t(e.baseStream.head()).head()}),(function(e){return e.flatStream?e.baseStream.hasNext()||e.flatStream.hasNext():e.baseStream.hasNext()&&t(e.baseStream.head()).hasNext()})))},x.ofHeadTail=function(t,e){return new x(x.generatorOf({h:t,supplier:e},(function(t){var e=t.supplier();return e.hasNext()?{h:e.head(),supplier:function(){return e.tail()}}:{h:null,supplier:null}}),(function(t){return t.h}),(function(t){return null!=t.h})))},x.of=function(t){for(var e=[{name:"Array",predicate:function(t){return t.constructor===Array}},{name:"Generator",predicate:function(t){return"function"==typeof t.hasNext&&"function"==typeof t.next&&"function"==typeof t.peek}},{name:"Stream",predicate:function(t){return t.__proto__==x.prototype}}],n={Array:function(t){return new x(x.generatorOf({i:0,array:t},(function(t){return{i:t.i+1,array:t.array}}),(function(t){return t.array[t.i]}),(function(t){return t.i<t.array.length})))},Generator:function(t){return new x(t)},Stream:function(t){return new x(t.gen,t.mapFunction,t.filterPredicate)}},r=0;r<e.length;r++)if(e[r].predicate(t))return n[e[r].name](t);throw"Iterable ".concat(t," does not have a stream")},x.range=function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return new x(x.generatorOf(t,(function(t){return t+n}),(function(t){return t}),(function(t){return null==e||t<e})))},x.generatorOf=function(t,e,n,r){return new function(){this.state=t,this.next=e,this.peek=n,this.hasNext=r}},x.Collectors={toArray:function(){return new function(){this.identity=[],this.reduce=function(t,e){return t.push(e),t}}}};var A=x;function k(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}var I={concat:function(t,e){return t.concat(e)},arrayEquals:function(t,e){if(t.length!=e.length)return!1;for(var n=0;n<t.length;n++)if(t[n]!=e[n])return!1;return!0},permute:function(t,e){for(var n=t.slice(),r=Math.min(t.length,e.length),a=0;a<r;a++)n[e[a]]=t[a];return n},randomPermute:function(t){for(var e=k(t),n=t.length-1;n>0;n--){var r=Math.floor(Math.random()*(n+1)),a=e[n];e[n]=e[r],e[r]=a}return e},swap:function(t,e,n){var r=t[e];return t[e]=t[n],t[n]=r,t},findJsArrayDim:function(t){return t instanceof Array?I.concat(I.findJsArrayDim(t[0]),[t.length]):[]},unpackJsArray:function(t){if(t instanceof Array){for(var e=[],n=0;n<t.length;n++)e=I.concat(e,I.unpackJsArray(t[n]));return e}return[t]},range:function(t,e){for(var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,r=[],a=t;a<e;a+=n)r.push(a);return r},binaryOp:function(t,e,n){for(var r=t.length<e.length?t.slice():e.slice(),a=0;a<r.length;a++)r[a]=n(t[a],e[a]);return r},map:function(t,e){for(var n=[],r=0;r<t.length;r++)n.push(e(t[r],r));return n},filter:function(t,e){for(var n=[],r=0;r<t.length;r++)e(t[r],r)&&n.push(t[r]);return n},forEach:function(t,e){for(var n=0;n<t.length;n++)e(t[n],n)}},T=I;function E(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}var C={};function O(t,e,n){if(e>=0&&e<t.length&&n>=0&&n<t.length){var r=t[e];t[e]=t[n],t[n]=r}}C.quicksort=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(t,e){return t-e},n=t.length,r=E(t),a=[];for(a.push(0),a.push(n-1);a.length>0;){var i=a.pop(),o=a.pop();if(o<i){var u=o+Math.floor((i-o)*Math.random()),c=r[u];O(r,u,i);for(var s=o,f=o;f<i;f++)e(r[f],c)<=0&&(O(r,f,s),s++);O(r,s,i),a.push(o),a.push(s-1),a.push(s+1),a.push(i)}}return r},C.REVERSE_SORT_COMPARATOR=function(t,e){return e-t};var P=C,M={distanceFactory:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return function(r,a){for(var i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:function(t){},o=r.length,u=a.length,c=j(o+1,u+1),s=0;s<o+1;s++)c[s][0]=s*e;for(var f=0;f<u+1;f++)c[0][f]=f*n;for(var h=1;h<o+1;h++)for(var l=1;l<u+1;l++){var p=r[h-1]===a[l-1],v=c[h-1][l]+e,g=c[h][l-1]+n,y=c[h-1][l-1]+(p?0:t);c[h][l]=N(v,g,y)}return i(c,r,a),c[o][u]}}};M.distance=M.distanceFactory(),M.printDistanceMatrix=function(t,e,n){var r=[];t.forEach((function(t,e){var n=[];t.forEach((function(t,e){return n.push("".concat(t))})),r.push(n.join(" "))})),console.log("w1: ".concat(e,", w2: ").concat(n),r.join("\n"))};var j=function(t,e){return Array.from(Array(t),(function(){return new Array(e)}))},N=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];return e.reduce((function(t,e){return Math.min(t,e)}),Number.MAX_VALUE)},L=M;function _(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],(function(){}))),!0}catch(t){return!1}}function R(t,e,n){return(R=_()?Reflect.construct:function(t,e,n){var r=[null];r.push.apply(r,e);var a=new(Function.bind.apply(t,r));return n&&D(a,n.prototype),a}).apply(null,arguments)}function D(t,e){return(D=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t})(t,e)}function F(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function V(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function z(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function U(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}var W=function(){function t(){V(this,t);for(var e=arguments.length,n=new Array(e),r=0;r<e;r++)n[r]=arguments[r];this.vec=n.map((function(t){return t||0}))}var e,n,r;return e=t,r=[{key:"fromArray",value:function(e){return R(t,F(e))}},{key:"of",value:function(){for(var e=arguments.length,n=new Array(e),r=0;r<e;r++)n[r]=arguments[r];return R(t,n)}}],(n=[{key:"toArray",value:function(){return F(this.vec)}},{key:"toString",value:function(){return"["+this.vec.join(", ")+"]"}},{key:"add",value:function(t){return this.op(t,(function(t,e){return t+e}))}},{key:"sub",value:function(t){return this.op(t,(function(t,e){return t-e}))}},{key:"mul",value:function(t){return this.op(t,(function(t,e){return t*e}))}},{key:"div",value:function(t){return this.op(t,(function(t,e){return t/e}))}},{key:"dot",value:function(t){return this.vec.reduce((function(e,n,r){return e+n*t.vec[r]}),0)}},{key:"length",value:function(){return Math.sqrt(this.dot(this))}},{key:"normalize",value:function(){return this.scale(1/this.length())}},{key:"scale",value:function(t){return this.map((function(e){return e*t}))}},{key:"map",value:function(e){return t.fromArray(this.vec.map(e))}},{key:"op",value:function(e,n){return t.fromArray(this.vec.map((function(t,r){return n(t,e.vec[r])})))}},{key:"reduce",value:function(t,e){return this.vec.reduce(t,e)}}])&&z(e.prototype,n),r&&z(e,r),t}();function q(t,e){return function(t){if(Array.isArray(t))return t}(t)||function(t,e){if(!(Symbol.iterator in Object(t))&&"[object Arguments]"!==Object.prototype.toString.call(t))return;var n=[],r=!0,a=!1,i=void 0;try{for(var o,u=t[Symbol.iterator]();!(r=(o=u.next()).done)&&(n.push(o.value),!e||n.length!==e);r=!0);}catch(t){a=!0,i=t}finally{try{r||null==u.return||u.return()}finally{if(a)throw i}}return n}(t,e)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function B(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function Q(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function J(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function X(t,e){var n=e.get(t);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(t):n.value}function H(t,e,n){var r=e.get(t);if(!r)throw new TypeError("attempted to set private field on non-instance");if(r.set)r.set.call(t,n);else{if(!r.writable)throw new TypeError("attempted to set read only private field");r.value=n}return n}U(W,"ZERO",(function(t){return R(W,F(new Array(t).fill(0)))})),U(W,"e",(function(t){return function(e){return R(W,F(new Array(t).fill(0).map((function(t,n){return n===e?1:0}))))}}));var Y=new WeakMap,G=new WeakMap,Z=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;B(this,t),Y.set(this,{writable:!0,value:null}),G.set(this,{writable:!0,value:null}),J(this,"key",this.left),J(this,"val",this.right),J(this,"first",this.left),J(this,"second",this.right),J(this,"car",this.left),J(this,"cdr",this.right),H(this,Y,e),H(this,G,n)}var e,n,r;return e=t,r=[{key:"of",value:function(e,n){return new t(e,n)}},{key:"fromArray",value:function(e){var n=q(e,2);return new t(n[0],n[1])}}],(n=[{key:"left",value:function(){return X(this,Y)}},{key:"right",value:function(){return X(this,G)}},{key:"map",value:function(e){return t.fromArray([X(this,Y),X(this,G)].map(e))}},{key:"reduce",value:function(t,e){return[X(this,Y),X(this,G)].reduce(t,e)}},{key:"op",value:function(e,n){return t.of(n(X(this,Y),X(e,Y)),n(X(this,G),X(e,G)))}},{key:"isEmpty",value:function(){return!X(this,Y)&&!X(this,G)}},{key:"toArray",value:function(){return[X(this,Y),X(this,G)]}}])&&Q(e.prototype,n),r&&Q(e,r),t}();function K(t){return function(t){if(Array.isArray(t))return t}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function $(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function tt(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function et(t,e,n){return e in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function nt(t,e){var n=e.get(t);if(!n)throw new TypeError("attempted to get private field on non-instance");return n.get?n.get.call(t):n.value}function rt(t,e,n){var r=e.get(t);if(!r)throw new TypeError("attempted to set private field on non-instance");if(r.set)r.set.call(t,n);else{if(!r.writable)throw new TypeError("attempted to set read only private field");r.value=n}return n}J(Z,"cons",Z.of);var at=new WeakMap,it=new WeakMap,ot=new WeakMap,ut=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:t.EMPTY_LIST;if($(this,t),at.set(this,{writable:!0,value:new Z}),it.set(this,{writable:!0,value:null}),ot.set(this,{writable:!0,value:-1}),et(this,"sum",this.concat),null==e)return this;rt(this,at,new Z(e,ct(n)?new t:n)),rt(this,it,this.getLast())}var e,n,r;return e=t,r=[{key:"fromArray",value:function(e){var n=K(e),r=n[0],a=n.slice(1);return r?new t(r,t.fromArray(a)):new t}},{key:"of",value:function(){for(var e=arguments.length,n=new Array(e),r=0;r<e;r++)n[r]=arguments[r];return t.fromArray(n)}},{key:"rangeTail",value:function(e,n,r,a){return e>=n?a:t.rangeTail(e+r,n,r,a.concat(new t(e)))}}],(n=[{key:"head",value:function(){return nt(this,at).left()}},{key:"tail",value:function(){return nt(this,at).right()}},{key:"concat",value:function(e){return this.isEmpty()?e:new t(this.head(),this.tail().concat(e))}},{key:"concatTail",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:this;return this.isEmpty()?t:t.isEmpty()?e:this.concatTail(t.tail(),e.push(t.head()))}},{key:"push",value:function(e){if(this.isEmpty())return new t(e);var n=new t(e);return this.getLast().concat(n),rt(this,it,n),this}},{key:"map",value:function(t){}},{key:"isEmpty",value:function(){return nt(this,at).isEmpty()}},{key:"length",value:function(){return nt(this,ot)>=0?nt(this,ot):this.isEmpty()?0:(rt(this,ot,1+this.tail().length()),nt(this,ot))}},{key:"getLast",value:function(){return null!==nt(this,it)?nt(this,it):this.tail().isEmpty()?this:(rt(this,it,this.tail().getLast()),nt(this,it))}},{key:"toArray",value:function(){return this.isEmpty()?[]:[this.head()].concat(this.tail().toArray())}},{key:"toString",value:function(){return this.isEmpty()?"[]":"[".concat(this.toStringRecursive(),"]")}},{key:"toStringRecursive",value:function(){return this.isEmpty()?"":"".concat(this.head(),", ").concat(this.tail().toStringRecursive())}}])&&tt(e.prototype,n),r&&tt(e,r),t}();function ct(t){return!(t&&t instanceof ut)}et(ut,"EMPTY_LIST",new ut),et(ut,"range",(function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return function(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;return t<e?new ut(t,ut.range(t+n)(e,n)):ut.EMPTY_LIST}})),et(ut,"range0",ut.range(0)),et(ut,"rangeR",(function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return function(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:1;return ut.rangeTail(t,e,n,new ut)}}))}])}));
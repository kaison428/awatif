import{a as l}from"./app-CIaixsCP.js";const p={dx:{value:2,min:1,max:5,step:.1,label:"dx (m)"},dy:{value:2,min:1,max:5,step:.1,label:"dy (m)"},dz:{value:2,min:1,max:5,step:.1,label:"dz (m)"},divisions:{value:4,min:1,max:10,step:1}};function m(s){const r=s.dx.value,i=s.dy.value,u=s.dz.value,n=s.divisions.value;let o=[],t=[];for(let e=0;e<=n;e++)o.push([0,0,u*e],[r,0,u*e],[r,i,u*e],[0,i,u*e]);o=o.map(e=>[6+e[0],6+e[1],e[2]]);for(let e=0;e<n*4;)e+=4,t.push([e,e+1],[e+1,e+2],[e+2,e+3],[e+3,e]),t.push([e,e+2]);for(let e=0;e<n*4;e++)t.push([e,e+4]);for(let e=0;e<n*4;e+=4)t.push([e,e+5],[e+3,e+6]),t.push([e,e+7],[e+1,e+6]);const a=[...t.map((e,d)=>({element:d,area:10,elasticity:100})),{node:0,support:[!0,!0,!0]},{node:1,support:[!0,!0,!0]},{node:2,support:[!0,!0,!0]},{node:3,support:[!0,!0,!0]}];return{nodes:o,elements:t,assignments:a}}l({parameters:p,onParameterChange:m,settings:{deformedShape:!0,gridSize:15}});
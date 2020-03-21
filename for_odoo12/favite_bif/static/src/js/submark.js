odoo.define('favite_bif.submark', function (require) {
"use strict";

var Class = require('web.Class');

var SEARCH_SUBMARK_HEIGHT = 5000;
var WIDTH_LIMIT_FOR_SEGMENT = 5000;

var Submark = Class.extend({
	init: function (panel,dMarkWidth,dMarkHeight,offsetX,offsetY) {
		this.panel = panel;
		this.dMarkWidth = dMarkWidth;
		this.dMarkHeight = dMarkHeight;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this.pMarkRegionArray = new Array();
	},
	
	getPlygonSubMark:function(obj){
		if(obj.points.length < 3)
			return;
		
		//var dMarkWidth = Math.max(dPeriodX, dPeriodY) * 3 / 2;
    	//var dMarkHeight = dMarkWidth;
		var offsetX = this.offsetX;
		var offsetY = this.offsetY;
		
		var polygon = new Array();
		var minX = Infinity;
		var minY = Infinity;
		var maxX = -Infinity;
		var maxY = -Infinity;
		_.each(obj.points,function(pt){
				polygon.push(new fabric.Point(pt.ux,pt.uy));
				if(pt.ux > maxX) maxX = pt.ux;
				if(pt.ux < minX) minX = pt.ux;
				if(pt.uy > maxY) maxY = pt.uy;
				if(pt.uy < minY) minY = pt.uy;
			});

		for (var x = minX; x <= maxX; x+=offsetX) {
			var a1 = new fabric.Point(x,maxY+1);
			var a2 = new fabric.Point(x,minY-1);
			var inter = fabric.Intersection.intersectLinePolygon(a1, a2, polygon);
			
			for(var i=0;i<inter.points.length;i++){
				var MarkRegionTemp = new Object();
				MarkRegionTemp.dPositionX = inter.points[i].x;
				MarkRegionTemp.dPositionY = inter.points[i].y;
				MarkRegionTemp.iMarkDirectionType = 0;
				MarkRegionTemp.dMarkWidth = this.dMarkWidth;
				MarkRegionTemp.dMarkHeight = this.dMarkHeight;

				this.pMarkRegionArray.push(MarkRegionTemp);
			}
		}
		
		for (var y = minY; y <= maxY; y+=offsetY) {
			var a1 = new fabric.Point(maxX+1,y);
			var a2 = new fabric.Point(minX-1,y);
			var inter = fabric.Intersection.intersectLinePolygon(a1, a2, polygon);
			
			for(var i=0;i<inter.points.length;i++){
				var MarkRegionTemp = new Object();
				MarkRegionTemp.dPositionX = inter.points[i].x;
				MarkRegionTemp.dPositionY = inter.points[i].y;
				MarkRegionTemp.iMarkDirectionType = 0;
				MarkRegionTemp.dMarkWidth = this.dMarkWidth;
				MarkRegionTemp.dMarkHeight = this.dMarkHeight;

				this.pMarkRegionArray.push(MarkRegionTemp);
			}
		}

	},
	
	getPanelPara: function(){
 		var dPanelLeft,dPanelBottom,dPanelRight,dPanelTop;
 		var id = 1;
		
 		while(this.panel.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'] != undefined){
 			var pos = this.panel.bifConf['auops.subpanel.subpanel_'+id+'.position.top_left'].split(',');
    		var left = parseFloat(pos[0]);
    		var top = parseFloat(pos[1]);
    		
    		pos = this.panel.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_right'].split(',');
    		var right = parseFloat(pos[0]);
    		var bottom = parseFloat(pos[1]);
    		
    		var pos2 = this.panel.bifConf['auops.subpanel.subpanel_'+id+'.position.top_right'].split(',');
    		var right2 = parseFloat(pos2[0]);
    		var top2 = parseFloat(pos2[1]);
    		
    		pos = this.panel.bifConf['auops.subpanel.subpanel_'+id+'.position.bottom_left'].split(',');
    		var left2 = parseFloat(pos[0]);
    		var bottom2 = parseFloat(pos[1]);
    		
    		var tmp = left * Math.cos(-this.panel.glass_angle) + top * Math.sin(-this.panel.glass_angle) + this.panel.glass_center_x;
    		top = -left * Math.sin(-this.panel.glass_angle) + top * Math.cos(-this.panel.glass_angle) + this.panel.glass_center_y;
    		left = tmp;
    		
    		tmp = right * Math.cos(-this.panel.glass_angle) + bottom * Math.sin(-this.panel.glass_angle) + this.panel.glass_center_x;
    		bottom = -right * Math.sin(-this.panel.glass_angle) + bottom * Math.cos(-this.panel.glass_angle) + this.panel.glass_center_y;
    		right = tmp;
    		
    		tmp = left2 * Math.cos(-this.panel.glass_angle) + bottom2 * Math.sin(-this.panel.glass_angle) + this.panel.glass_center_x;
    		bottom2 = -left2 * Math.sin(-this.panel.glass_angle) + bottom2 * Math.cos(-this.panel.glass_angle) + this.panel.glass_center_y;
    		left2 = tmp;
    		
    		tmp = right2 * Math.cos(-this.panel.glass_angle) + top2 * Math.sin(-this.panel.glass_angle) + this.panel.glass_center_x;
    		top2 = -right2 * Math.sin(-this.panel.glass_angle) + top2 * Math.cos(-this.panel.glass_angle) + this.panel.glass_center_y;
    		right2 = tmp;
    		
    		var dOutputX = this.panel.coord.pmpPanelMapPara.dPanelCenterX;
    		var dOutputY = this.panel.coord.pmpPanelMapPara.dPanelCenterY;
    		if(dOutputX > left && dOutputX < right && dOutputY < bottom && dOutputY > top){
    			//var name = this.panel.bifConf['auops.subpanel.subpanel_'+id+'.global_subpanel_data'];
				//pos = this.panel.bifConf['auops.global_subpanel_data.'+name+'.cellneighbor.check.basicpixelsize'].split(',');
				
	    		//dPeriodX = parseFloat(pos[0]);
	    		//dPeriodY = parseFloat(pos[1]);
	    		dPanelLeft = Math.max(left,left2);
	    		dPanelTop = Math.min(bottom,bottom2);
	    		dPanelBottom = Math.max(top,top2);
	    		dPanelRight = Math.min(right,right2);

	    		return {dPanelLeft,dPanelTop,dPanelRight,dPanelBottom};
    		}
    		id++;
 		}
 	 },
 	 
 	
	
 	getNormalSubMark:function(dPanelLeft,dPanelBottom,dPanelRight,dPanelTop,dMarkWidth,dMarkHeight){
    	var pMarkRegionArray = new Array();
    	
    	var iCount;
    	var dSearchMarkHeight;				//Search Mark Range in Vertical Frame
    	var dResolutionX;					//Resolution X
    	var dResolutionY;					//Resolution Y

    	var dScanRangeBottom;				//Scan Range Bottom
    	var dScanRangeTop;					//Scan Range Top
    	var dScanRangeLeft;					//Scan Range Left
    	var dScanRangeRight;					//Scan Range Right
    	var bNeedSegment;						//Segment Flag
    	
    	//var dMarkWidth = Math.max(dPeriodX, dPeriodY) * 3 / 2;
    	//var dMarkHeight = dMarkWidth;
    	
    	//Left Frame Mark
    	let {iIP:iIPIndex_Bottom, iScan:iScanIndex_Bottom} = this.panel.coord.JudgeIPScan_UM(dPanelLeft, dPanelBottom);
    	
    	if(iIPIndex_Bottom == undefined || iScanIndex_Bottom == undefined)
    	{
    		iIPIndex_Bottom = -1;
    		iScanIndex_Bottom = -1;
    		iIPIndex_Top = -1;
    		iScanIndex_Top = -1;
    	}
    	
    	let {iIP:iIPIndex_Top, iScan:iScanIndex_Top} = this.panel.coord.JudgeIPScan_UM(dPanelLeft, dPanelTop);
    	
    	if(iIPIndex_Top == undefined || iScanIndex_Top == undefined)
    	{
    		iIPIndex_Bottom = -1;
    		iScanIndex_Bottom = -1;
    		iIPIndex_Top = -1;
    		iScanIndex_Top = -1;
    	}

    	if(iIPIndex_Top > iIPIndex_Bottom && iIPIndex_Top != -1 && iIPIndex_Bottom != -1)
    	{
    		//Down Camera
    		dScanRangeTop = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Top;
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionY;

    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dScanRangeTop - dPanelBottom) / dSearchMarkHeight);

    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp = new Object();

    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;

    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dScanRangeTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;

    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}

    		//Up Camera
    		dScanRangeBottom = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Bottom;
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dResolutionY;

    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dPanelTop - dScanRangeBottom) / dSearchMarkHeight);

    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp = new Object();

    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;

    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;

    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dScanRangeBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}
    	}
    	else if(iIPIndex_Top == iIPIndex_Bottom && iIPIndex_Bottom != -1 && iIPIndex_Top != -1)
    	{
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionY;
    		
    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dPanelTop - dPanelBottom) / dSearchMarkHeight);
    		
    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp =  new Object();
    			
    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;
    				
    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelLeft;

    				if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    				}
    				
    				MarkRegionTemp.dPositionY = dPanelBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}
    	}	

    	//Right
    	let {iIP:iIPIndex_Bottom2, iScan:iScanIndex_Bottom2} = this.panel.coord.JudgeIPScan_UM(dPanelRight, dPanelBottom);

    	if(iIPIndex_Bottom == undefined || iScanIndex_Bottom == undefined)
    	{
    		iIPIndex_Bottom = -1;
    		iScanIndex_Bottom = -1;
    		iIPIndex_Top = -1;
    		iScanIndex_Top = -1;
    	}else{
    		iIPIndex_Bottom = iIPIndex_Bottom2;
    		iScanIndex_Bottom = iScanIndex_Bottom2;
    	}

    	let {iIP:iIPIndex_Top2, iScan:iScanIndex_Top2} = this.panel.coord.JudgeIPScan_UM(dPanelRight, dPanelTop);

    	if(iIPIndex_Top == undefined || iScanIndex_Top == undefined)
    	{
    		iIPIndex_Bottom = -1;
    		iScanIndex_Bottom = -1;
    		iIPIndex_Top = -1;
    		iScanIndex_Top = -1;
    	}else{
    		iIPIndex_Top = iIPIndex_Top2;
    		iScanIndex_Top = iScanIndex_Top2;
    	}

    	if(iIPIndex_Top > iIPIndex_Bottom && iIPIndex_Top != -1 && iIPIndex_Bottom != -1)
    	{
    		//Down Camera
    		dScanRangeTop = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Top;
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionY;

    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dScanRangeTop - dPanelBottom) / dSearchMarkHeight);

    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp = new Object();

    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dScanRangeTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}

    		//Up Camera
    		dScanRangeBottom = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Bottom;
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Top].aScanParaArray[iScanIndex_Top].dResolutionY;

    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dPanelTop - dScanRangeBottom) / dSearchMarkHeight);

    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp = new Object();

    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dScanRangeBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}
    	}
    	else if(iIPIndex_Top == iIPIndex_Bottom && iIPIndex_Bottom != -1 && iIPIndex_Top != -1)
    	{
    		dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Left;
    		dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dRange_Right;
    		dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionX;
    		dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex_Bottom].aScanParaArray[iScanIndex_Bottom].dResolutionY;

    		dSearchMarkHeight = SEARCH_SUBMARK_HEIGHT * dResolutionY;
    		iCount = Math.ceil((dPanelTop - dPanelBottom) / dSearchMarkHeight);

    		for(var i = 0; i < iCount; i ++)
    		{
    			var MarkRegionTemp = new Object();

    			if(i == iCount - 1)
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelTop - dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}
    			else
    			{
    				MarkRegionTemp.dPositionX = dPanelRight;

    				if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    				{
    					MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    				}

    				MarkRegionTemp.dPositionY = dPanelBottom + i * dSearchMarkHeight + dMarkHeight * 3 / 2;
    				MarkRegionTemp.iMarkDirectionType = 0;
    				MarkRegionTemp.iIPIndex = iIPIndex_Bottom;
    				MarkRegionTemp.iScanIndex = iScanIndex_Bottom;
    				MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    				MarkRegionTemp.dMarkWidth = dMarkWidth;
    				MarkRegionTemp.dMarkHeight = dMarkHeight;
    			}

    			pMarkRegionArray.push(MarkRegionTemp);
    		}
    	}
    	
    	//Bottom
    	let {iIP:iIPIndex_Left, iScan:iScanIndex_Left} = this.panel.coord.JudgeIPScan_UM(dPanelLeft, dPanelBottom);
    	
    	if(iIPIndex_Left == undefined || iScanIndex_Left == undefined)
    	{
    		iIPIndex_Left = 0;
    		iIPIndex_Right = -1;
    		iScanIndex_Left = 0;
    		iScanIndex_Right = -1;
    	}
    	
    	let {iIP:iIPIndex_Right, iScan:iScanIndex_Right} = this.panel.coord.JudgeIPScan_UM(dPanelRight, dPanelBottom);

    	if(iIPIndex_Right == undefined || iScanIndex_Right == undefined)
    	{
    		iIPIndex_Left = 0;
    		iIPIndex_Right = -1;
    		iScanIndex_Left = 0;
    		iScanIndex_Right = -1;
    	}
    	
    	for(var iIPIndex = iIPIndex_Left; iIPIndex <= iIPIndex_Right; iIPIndex ++)
    	{
    		var iScanIndexMin;
    		var iScanIndexMax;
    		
    		if(iIPIndex == iIPIndex_Left)
    		{
    			iScanIndexMin = iScanIndex_Left;
    		}
    		else
    		{
    			iScanIndexMin = 0;
    		}
    		
    		if(iIPIndex == iIPIndex_Right)
    		{
    			iScanIndexMax = iScanIndex_Right;
    		}
    		else
    		{
    			iScanIndexMax = this.panel.coord.mpMachinePara.iTotalScan - 1;
    		}
    		
    		for(var iScanIndex = iScanIndexMin; iScanIndex <= iScanIndexMax; iScanIndex ++)
    		{
    			dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    			dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    			
    			if(iIPIndex == iIPIndex_Left && iScanIndex == iScanIndex_Left)
    			{
    				if(Math.abs(dScanRangeRight - dPanelLeft) > (dResolutionX * WIDTH_LIMIT_FOR_SEGMENT))
    				{
    					bNeedSegment = true;
    				}
    				else
    				{
    					bNeedSegment = false;
    				}
    				
    				if(bNeedSegment)
    				{
    					var MarkRegionTempLeft = new Object();
    					var MarkRegionTempRight = new Object();
    					
    					//Left
    					MarkRegionTempLeft.dPositionX = ((dScanRangeRight + dPanelLeft) / 2 + dPanelLeft) / 2;
    					MarkRegionTempLeft.dPositionY = dPanelBottom;
    					MarkRegionTempLeft.iMarkDirectionType = 1;
    					MarkRegionTempLeft.iIPIndex = iIPIndex;
    					MarkRegionTempLeft.iScanIndex = iScanIndex;
    					MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    					MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    					MarkRegionTempLeft.dMarkWidth = dMarkWidth;
    					MarkRegionTempLeft.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempLeft);

    					//Right
    					MarkRegionTempRight.dPositionX = ((dScanRangeRight + dPanelLeft) / 2 + dScanRangeRight) / 2;
    					MarkRegionTempRight.dPositionY = dPanelBottom;
    					MarkRegionTempRight.iMarkDirectionType = 1;
    					MarkRegionTempRight.iIPIndex = iIPIndex;
    					MarkRegionTempRight.iScanIndex = iScanIndex;
    					MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    					MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    					MarkRegionTempRight.dMarkWidth = dMarkWidth;
    					MarkRegionTempRight.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempRight);
    				}
    				else
    				{
    					var MarkRegionTemp = new Object();

    					MarkRegionTemp.dPositionX = (dScanRangeRight + dPanelLeft) / 2;
    					
    					if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    					{
    						MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    					}
    					
    					MarkRegionTemp.dPositionY = dPanelBottom;
    					MarkRegionTemp.iMarkDirectionType = 1;
    					MarkRegionTemp.iIPIndex = iIPIndex;
    					MarkRegionTemp.iScanIndex = iScanIndex;
    					MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTemp.dMarkWidth = dMarkWidth;
    					MarkRegionTemp.dMarkHeight = dMarkHeight;
    					
    					pMarkRegionArray.push(MarkRegionTemp);
    				}
    			}
    			else if(iIPIndex == iIPIndex_Right && iScanIndex == iScanIndex_Right)
    			{
    				if(Math.abs(dPanelRight - dScanRangeLeft) > (dResolutionX * WIDTH_LIMIT_FOR_SEGMENT))
    				{
    					bNeedSegment = true;
    				}
    				else
    				{
    					bNeedSegment = false;
    				}
    				
    				if(bNeedSegment)
    				{
    					var MarkRegionTempLeft = new Object();
    					var MarkRegionTempRight = new Object();
    					
    					//Left
    					MarkRegionTempLeft.dPositionX = ((dScanRangeLeft + dPanelRight) / 2 + dScanRangeLeft) / 2;
    					MarkRegionTempLeft.dPositionY = dPanelBottom;
    					MarkRegionTempLeft.iMarkDirectionType = 1;
    					MarkRegionTempLeft.iIPIndex = iIPIndex;
    					MarkRegionTempLeft.iScanIndex = iScanIndex;
    					MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    					MarkRegionTempLeft.dMarkWidth = dMarkWidth;
    					MarkRegionTempLeft.dMarkHeight = dMarkHeight;
    					
    					pMarkRegionArray.push(MarkRegionTempLeft);
    					
    					//Right
    					MarkRegionTempRight.dPositionX = ((dScanRangeLeft + dPanelRight) / 2 + dPanelRight) / 2;
    					MarkRegionTempRight.dPositionY = dPanelBottom;
    					MarkRegionTempRight.iMarkDirectionType = 1;
    					MarkRegionTempRight.iIPIndex = iIPIndex;
    					MarkRegionTempRight.iScanIndex = iScanIndex;
    					MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTempRight.dMarkWidth = dMarkWidth;
    					MarkRegionTempRight.dMarkHeight = dMarkHeight;
    					
    					pMarkRegionArray.push(MarkRegionTempRight);
    				}
    				else
    				{
    					var MarkRegionTemp = new Object();
    					
    					MarkRegionTemp.dPositionX = (dScanRangeLeft + dPanelRight) / 2;
    					
    					if(MarkRegionTemp.dPositionX < (dScanRangeLeft + dMarkWidth / 2))
    					{
    						MarkRegionTemp.dPositionX = dScanRangeRight + dMarkWidth;
    					}

    					MarkRegionTemp.dPositionY = dPanelBottom;
    					MarkRegionTemp.iMarkDirectionType = 1;
    					MarkRegionTemp.iIPIndex = iIPIndex;
    					MarkRegionTemp.iScanIndex = iScanIndex;
    					MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    					MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTemp.dMarkWidth = dMarkWidth;
    					MarkRegionTemp.dMarkHeight = dMarkHeight;
    					
    					pMarkRegionArray.push(MarkRegionTemp);
    				}
    			}
    			else
    			{
    				var MarkRegionTempLeft = new Object();
    				var MarkRegionTempRight = new Object();

    				//Left
    				MarkRegionTempLeft.dPositionX = ((dScanRangeLeft + dScanRangeRight) / 2 + dScanRangeLeft) / 2;
    				MarkRegionTempLeft.dPositionY = dPanelBottom;
    				MarkRegionTempLeft.iMarkDirectionType = 1;
    				MarkRegionTempLeft.iIPIndex = iIPIndex;
    				MarkRegionTempLeft.iScanIndex = iScanIndex;
    				MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    				MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    				MarkRegionTempLeft.dMarkWidth = dMarkWidth;
					MarkRegionTempLeft.dMarkHeight = dMarkHeight;
    				
    				pMarkRegionArray.push(MarkRegionTempLeft);

    				//Right
    				MarkRegionTempRight.dPositionX = ((dScanRangeLeft + dScanRangeRight) / 2 + dScanRangeRight) / 2;
    				MarkRegionTempRight.dPositionY = dPanelBottom;
    				MarkRegionTempRight.iMarkDirectionType = 1;
    				MarkRegionTempRight.iIPIndex = iIPIndex;
    				MarkRegionTempRight.iScanIndex = iScanIndex;
    				MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX);
    				MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    				MarkRegionTempRight.dMarkWidth = dMarkWidth;
					MarkRegionTempRight.dMarkHeight = dMarkHeight;
    				
    				pMarkRegionArray.push(MarkRegionTempRight);
    			}
    		}
    	}
    	
    	//Top
    	let {iIP:iIPIndex_Left2, iScan:iScanIndex_Left2} = this.panel.coord.JudgeIPScan_UM(dPanelLeft, dPanelTop);
    	
    	if(iIPIndex_Left2 == undefined || iScanIndex_Left2 == undefined)
    	{
    		iIPIndex_Left = 0;
    		iIPIndex_Right = -1;
    		iScanIndex_Left = 0;
    		iScanIndex_Right = -1;
    	}else{
    		iIPIndex_Left =iIPIndex_Left2;
    		iScanIndex_Left = iScanIndex_Left2;
    	}
    	
    	let {iIP:iIPIndex_Right2, iScan:iScanIndex_Right2} = this.panel.coord.JudgeIPScan_UM(dPanelRight, dPanelTop);
    	
    	if(iIPIndex_Right2 == undefined || iScanIndex_Right2 == undefined)
    	{
    		iIPIndex_Left = 0;
    		iIPIndex_Right = -1;
    		iScanIndex_Left = 0;
    		iScanIndex_Right = -1;
    	}else{
    		iIPIndex_Right =iIPIndex_Right2;
    		iScanIndex_Right = iScanIndex_Right2;
    	}
    	
    	for(var iIPIndex = iIPIndex_Left; iIPIndex <= iIPIndex_Right; iIPIndex ++)
    	{
    		var iScanIndexMin;
    		var iScanIndexMax;

    		if(iIPIndex == iIPIndex_Left)
    		{
    			iScanIndexMin = iScanIndex_Left;
    		}
    		else
    		{
    			iScanIndexMin = 0;
    		}

    		if(iIPIndex == iIPIndex_Right)
    		{
    			iScanIndexMax = iScanIndex_Right;
    		}
    		else
    		{
    			iScanIndexMax = this.panel.coord.mpMachinePara.iTotalScan - 1;
    		}

    		for(var iScanIndex = iScanIndexMin; iScanIndex <= iScanIndexMax; iScanIndex ++)
    		{
    			dScanRangeLeft = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			dScanRangeRight = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			dResolutionX = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    			dResolutionY = this.panel.coord.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;

    			if(iIPIndex == iIPIndex_Left2 && iScanIndex == iScanIndex_Left2)
    			{
    				if(Math.abs(dScanRangeRight - dPanelLeft) > (dResolutionX * WIDTH_LIMIT_FOR_SEGMENT))
    				{
    					bNeedSegment = true;
    				}
    				else
    				{
    					bNeedSegment = false;
    				}

    				if(bNeedSegment)
    				{
    					var MarkRegionTempLeft = new Object();
    					var MarkRegionTempRight = new Object();

    					//Left
    					MarkRegionTempLeft.dPositionX = ((dScanRangeRight + dPanelLeft) / 2 + dPanelLeft) / 2;
    					MarkRegionTempLeft.dPositionY = dPanelTop;
    					MarkRegionTempLeft.iMarkDirectionType = 1;
    					MarkRegionTempLeft.iIPIndex = iIPIndex;
    					MarkRegionTempLeft.iScanIndex = iScanIndex;
    					MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTempLeft.dMarkWidth = dMarkWidth;
    					MarkRegionTempLeft.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempLeft);

    					//Right
    					MarkRegionTempRight.dPositionX = ((dScanRangeRight + dPanelLeft) / 2 + dScanRangeRight) / 2;
    					MarkRegionTempRight.dPositionY = dPanelTop;
    					MarkRegionTempRight.iMarkDirectionType = 1;
    					MarkRegionTempRight.iIPIndex = iIPIndex;
    					MarkRegionTempRight.iScanIndex = iScanIndex;
    					MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTempRight.dMarkWidth = dMarkWidth;
    					MarkRegionTempRight.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempRight);
    				}
    				else
    				{
    					var MarkRegionTemp = new Object();

    					MarkRegionTemp.dPositionX = (dScanRangeRight + dPanelLeft) / 2;
    					
    					if(MarkRegionTemp.dPositionX > dScanRangeRight - dMarkWidth / 2)
    					{
    						MarkRegionTemp.dPositionX = dScanRangeRight - dMarkWidth;
    					}
    					
    					MarkRegionTemp.dPositionY = dPanelTop;
    					MarkRegionTemp.iMarkDirectionType = 1;
    					MarkRegionTemp.iIPIndex = iIPIndex;
    					MarkRegionTemp.iScanIndex = iScanIndex;
    					MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    					MarkRegionTemp.dMarkWidth = dMarkWidth;
    					MarkRegionTemp.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTemp);
    				}
    			}
    			else if(iIPIndex == iIPIndex_Right2 && iScanIndex == iScanIndex_Right2)
    			{
    				if(Math.abs(dPanelRight - dScanRangeLeft) > (dResolutionX * WIDTH_LIMIT_FOR_SEGMENT))
    				{
    					bNeedSegment = true;
    				}
    				else
    				{
    					bNeedSegment = false;
    				}

    				if(bNeedSegment)
    				{
    					var MarkRegionTempLeft = new Object();
    					var MarkRegionTempRight = new Object();

    					//Left
    					MarkRegionTempLeft.dPositionX = ((dScanRangeLeft + dPanelRight) / 2 + dScanRangeLeft) / 2;
    					MarkRegionTempLeft.dPositionY = dPanelTop;
    					MarkRegionTempLeft.iMarkDirectionType = 1;
    					MarkRegionTempLeft.iIPIndex = iIPIndex;
    					MarkRegionTempLeft.iScanIndex = iScanIndex;
    					MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY);
    					MarkRegionTempLeft.dMarkWidth = dMarkWidth;
    					MarkRegionTempLeft.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempLeft);

    					//Right
    					MarkRegionTempRight.dPositionX = ((dScanRangeLeft + dPanelRight) / 2 + dPanelRight) / 2;
    					MarkRegionTempRight.dPositionY = dPanelTop;
    					MarkRegionTempRight.iMarkDirectionType = 1;
    					MarkRegionTempRight.iIPIndex = iIPIndex;
    					MarkRegionTempRight.iScanIndex = iScanIndex;
    					MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTempRight.dMarkWidth = dMarkWidth;
    					MarkRegionTempRight.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTempRight);
    				}
    				else
    				{
    					var MarkRegionTemp = new Object();

    					MarkRegionTemp.dPositionX = (dScanRangeLeft + dPanelRight) / 2;

    					if(MarkRegionTemp.dPositionX < dScanRangeLeft + dMarkWidth / 2)
    					{
    						MarkRegionTemp.dPositionX = dScanRangeLeft + dMarkWidth;
    					}

    					MarkRegionTemp.dPositionY = dPanelTop;
    					MarkRegionTemp.iMarkDirectionType = 1;
    					MarkRegionTemp.iIPIndex = iIPIndex;
    					MarkRegionTemp.iScanIndex = iScanIndex;
    					MarkRegionTemp.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    					MarkRegionTemp.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    					MarkRegionTemp.dMarkWidth = dMarkWidth;
        				MarkRegionTemp.dMarkHeight = dMarkHeight;

    					pMarkRegionArray.push(MarkRegionTemp);
    				}
    			}
    			else
    			{
    				var MarkRegionTempLeft = new Object();
    				var MarkRegionTempRight = new Object();

    				//Left
    				MarkRegionTempLeft.dPositionX = ((dScanRangeLeft + dScanRangeRight) / 2 + dScanRangeLeft) / 2;
    				MarkRegionTempLeft.dPositionY = dPanelTop;
    				MarkRegionTempLeft.iMarkDirectionType = 1;
    				MarkRegionTempLeft.iIPIndex = iIPIndex;
    				MarkRegionTempLeft.iScanIndex = iScanIndex;
    				MarkRegionTempLeft.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    				MarkRegionTempLeft.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    				MarkRegionTempLeft.dMarkWidth = dMarkWidth;
    				MarkRegionTempLeft.dMarkHeight = dMarkHeight;


    				pMarkRegionArray.push(MarkRegionTempLeft);

    				//Right
    				MarkRegionTempRight.dPositionX = ((dScanRangeLeft + dScanRangeRight) / 2 + dScanRangeRight) / 2;
    				MarkRegionTempRight.dPositionY = dPanelTop;
    				MarkRegionTempRight.iMarkDirectionType = 1;
    				MarkRegionTempRight.iIPIndex = iIPIndex;
    				MarkRegionTempRight.iScanIndex = iScanIndex;
    				MarkRegionTempRight.iSizeWidth = Math.round(dMarkWidth / dResolutionX );
    				MarkRegionTempRight.iSizeHeight = Math.round(dMarkHeight / dResolutionY );
    				MarkRegionTempRight.dMarkWidth = dMarkWidth;
					MarkRegionTempRight.dMarkHeight = dMarkHeight;

    				
    				pMarkRegionArray.push(MarkRegionTempRight);
    			}
    		}
    	}

    	return pMarkRegionArray;
    },
   
});

return Submark;

});
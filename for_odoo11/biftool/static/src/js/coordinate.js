odoo.define('padtool.coordinate', function (require) {
"use strict";

var Class = require('web.Class');

var USE_IP_NO =		8;
var CAMERAROW	=	2;
var USE_SCAN_NO	=	40;
var USE_BLOCK_X_NO=	10;
var USE_BLOCK_Y_NO=	10;


var SCAN_PARA =  Class.extend({
    init: function () {
/*    	this.dResolutionX = opt.dResolutionX;				//Scan Resolution X
    	this.dResolutionY = opt.dResolutionY;				//Scan Resolution Y
    	this.dOffsetX = opt.dOffsetX;					//Scan Offset X
    	this.dOffsetY = opt.dOffsetY;					//Scan Offset Y
    	this.dRange_Left = opt.dRange_Left;					//Scan Range Left(UM)
    	this.dRange_Right = opt.dRange_Right;				//Scan Range Right(UM)
    	this.dRange_Bottom = opt.dRange_Bottom;				//Scan Range Bottom(UM)
    	this.dRange_Top = opt.dRange_Top;					//Scan Range Top(UM)
    	this.iRange_Left = opt.iRange_Left;					//Scan Range Left(Pixel)
    	this.iRange_Right = opt.iRange_Right;					//Scan Range Right(Piexl)
    	this.iRange_Bottom = opt.iRange_Bottom;					//Scan Range Bottom(Pixel)
    	this.iRange_Top = opt.iRange_Top;						//Scan Range Top(Pixel)
    	this.iScanWidth = opt.iScanWidth;						//Scan Width(Pixel)
    	this.iScanHeight = opt.iScanHeight;					//Scan Height(Pixel)
    	this.iBlockHeight = opt.iBlockHeight;					//Block Height(Pixel)
*/
    },
});

var IP_PARA =  Class.extend({
    init: function (opt) {
    	//this.iTotalScan = opt.iTotalScan;				//IP Total Scan Num
    	this.aScanParaArray = new Array();
    	
    },
});

var MACHINE_PARA =  Class.extend({
    init: function (cameraConf,bifConf) {
    	this.aIPParaArray = new Array();
    	this.iTotalIP = 0;
    	
    	var pos = cameraConf.general.glass_center.split(',');
    	this.dGlassCenterX = parseFloat(pos[0]);
 		this.dGlassCenterY = parseFloat(pos[1]);
 		this.dAngle = parseFloat(cameraConf.general.angle);
    	
    	var keys = _.keys(cameraConf);
    	for(var i = 0; i < keys.length; i++){
    		if(keys[i] == 'general'){
    			continue;
    		}
    			
    		var res = keys[i].match(/\d+/g);
    		var ip = parseInt(res[0])-1;
    		var scan = parseInt(res[1])-1;
    		
    		if(!this.aIPParaArray[ip]){
    			this.iTotalIP++;
    			this.aIPParaArray[ip] = new IP_PARA();
        		this.aIPParaArray[ip].iTotalScan = 1;
        		
        		this.aIPParaArray[ip].aScanParaArray = new Array();
        		this.aIPParaArray[ip].aScanParaArray[scan] = new SCAN_PARA();
        		
    		}else{
    			this.aIPParaArray[ip].iTotalScan++;
    			
    			if(!this.aIPParaArray[ip].aScanParaArray[scan]){
    				this.aIPParaArray[ip].aScanParaArray[scan] = new SCAN_PARA();
    			}
    		}
    		
    		this.aIPParaArray[ip].aScanParaArray[scan].dOffsetX = parseFloat(cameraConf[keys[i]].table_x_offset);
    		this.aIPParaArray[ip].aScanParaArray[scan].dOffsetY = parseFloat(cameraConf[keys[i]].table_y_offset);
    		this.aIPParaArray[ip].aScanParaArray[scan].dResolutionX = parseFloat(cameraConf[keys[i]].camera_x_res);
    		this.aIPParaArray[ip].aScanParaArray[scan].dResolutionY = parseFloat(cameraConf[keys[i]].camera_y_res);
    		
    		var size = bifConf['auops.config.image.size'].match(/\d+/g);
    		this.aIPParaArray[ip].aScanParaArray[scan].iScanWidth = parseInt(size[0]);
    		this.aIPParaArray[ip].aScanParaArray[scan].iScanHeight = parseInt(size[1]);
    		this.aIPParaArray[ip].aScanParaArray[scan].iBlockHeight = parseInt(bifConf['auops.config.image.block_height']);
    		
    	}
    	this.iTotalScan = this.aIPParaArray[0].iTotalScan;
    	this.iTotalBlock = parseInt(bifConf['auops.config.image.block_buf_num']);
    	this.iCameraRaw = CAMERAROW;
    	
    	this.GetScanRangePixel();
    	this.GetScanRangeUM();
    	
    },
    
    GetScanRangeUM: function(){
    	var dResolutionX;
    	var dResolutionY;
    	
    	for(var i = 0; i < this.iTotalIP; i ++)
    	{
    		for(var j = 0; j < this.iTotalScan; j ++)
    		{
    			dResolutionX = this.aIPParaArray[i].aScanParaArray[j].dResolutionX;
    			dResolutionY = this.aIPParaArray[i].aScanParaArray[j].dResolutionY;
    			
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Left = this.aIPParaArray[i].aScanParaArray[j].dOffsetX;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Bottom = this.aIPParaArray[i].aScanParaArray[j].dOffsetY;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Right = this.aIPParaArray[i].aScanParaArray[j].dOffsetX + dResolutionX * this.aIPParaArray[i].aScanParaArray[j].iScanWidth;
    			this.aIPParaArray[i].aScanParaArray[j].dRange_Top = this.aIPParaArray[i].aScanParaArray[j].dOffsetY + dResolutionY * this.aIPParaArray[i].aScanParaArray[j].iScanHeight;
    		}
    	}
    },
    
    GetScanRangePixel: function()
    {
    	var iCameraNoPerRow;
    	var iTotalScan;
    	var dLeft;
    	var dBottom;
    	var iLeftTemp;
    	var iBottomTemp;
    	
    	iCameraNoPerRow = Math.floor(this.iTotalIP / this.iCameraRaw);
    	dLeft = 0;
    	dBottom = 0;
    	
    	for(var i = 0; i < this.iTotalIP; i ++)
    	{
    		iTotalScan = this.aIPParaArray[i].iTotalScan;
    		
    		for(var j = 0; j < iTotalScan; j ++)
    		{
    			if(i % iCameraNoPerRow == 0 && j == 0)
    			{
    				dLeft = (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[0].aScanParaArray[0].dOffsetX) / this.aIPParaArray[i].aScanParaArray[j].dResolutionX;
    			}
    			else if(j == 0)
    			{
    				dLeft += (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[i - 1].aScanParaArray[this.aIPParaArray[i - 1].iTotalScan - 1].dOffsetX) / this.aIPParaArray[i - 1].aScanParaArray[this.aIPParaArray[i - 1].iTotalScan - 1].dResolutionX;
    			}
    			else
    			{
    				dLeft += (this.aIPParaArray[i].aScanParaArray[j].dOffsetX - this.aIPParaArray[i].aScanParaArray[j - 1].dOffsetX) / this.aIPParaArray[i].aScanParaArray[j - 1].dResolutionX;
    			}
    			
    			if(i >= iCameraNoPerRow)
    			{
    				dBottom = (this.aIPParaArray[i].aScanParaArray[j].dOffsetY - this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dOffsetY) / this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dResolutionY + (this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dOffsetY - this.aIPParaArray[0].aScanParaArray[0].dOffsetY) / this.aIPParaArray[i - iCameraNoPerRow].aScanParaArray[j].dResolutionY;
    			}
    			else
    			{
    				dBottom = (this.aIPParaArray[i].aScanParaArray[j].dOffsetY - this.aIPParaArray[0].aScanParaArray[0].dOffsetY) / this.aIPParaArray[i].aScanParaArray[j].dResolutionY;
    			}
    			
    			iLeftTemp = Math.ceil(dLeft);
    			iBottomTemp = Math.ceil(dBottom);
    			
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Left = iLeftTemp;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Bottom = iBottomTemp;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Right = iLeftTemp + this.aIPParaArray[i].aScanParaArray[j].iScanWidth - 1;
    			this.aIPParaArray[i].aScanParaArray[j].iRange_Top = iBottomTemp + this.aIPParaArray[i].aScanParaArray[j].iScanHeight - 1;
    		}
    	}
    }
});

var GLASS_MAP_PARA = Class.extend({
	init: function (padConf) {
    	this.dRatioX = parseFloat(padConf['GLASS_INFORMATION']['GLASS_MAP_RATIO_X'.toLowerCase()]);
    	this.dRatioY = parseFloat(padConf['GLASS_INFORMATION']['GLASS_MAP_RATIO_Y'.toLowerCase()]);
    },
});

var PANEL_MAP_PARA = Class.extend({
	init: function (padConf,panelName) {
    	this.dRatioX = parseFloat(padConf[panelName]['PANEL_MAP_RATIO_X'.toLowerCase()]);
    	this.dRatioY = parseFloat(padConf[panelName]['PANEL_MAP_RATIO_Y'.toLowerCase()]);
    	this.dPanelCenterX = parseFloat(padConf[panelName]['PANEL_CENTER_X'.toLowerCase()]);
    	this.dPanelCenterY = parseFloat(padConf[panelName]['PANEL_CENTER_Y'.toLowerCase()]);
    	
    	this.dPanelMapLeft = parseFloat(padConf[panelName]['PANEL_MAP_LEFT'.toLowerCase()]);
    	this.dPanelMapBottom = parseFloat(padConf[panelName]['PANEL_MAP_BOTTOM'.toLowerCase()]);
    	this.dPanelMapRight = parseFloat(padConf[panelName]['PANEL_MAP_RIGHT'.toLowerCase()]);
    	this.dPanelMapTop = parseFloat(padConf[panelName]['PANEL_MAP_TOP'.toLowerCase()]);
    },
});

var GLASS_INFORMATION = Class.extend({
	init: function (gmdConf) {
		var iCutCorner = parseInt(gmdConf['Glass Map Information']['Cut Corner Position'.toLowerCase()]);
		var dGlassSizeX = parseInt(gmdConf['Glass Map Information']['Glass Size X'.toLowerCase()]);
		var dGlassSizeY = parseInt(gmdConf['Glass Map Information']['Glass Size Y'.toLowerCase()]);
		var iCenterMode = parseInt(gmdConf['Glass Map Information']['Center Mode'.toLowerCase()]);
		var iStartQuadrant = parseInt(gmdConf['Glass Map Information']['Start Quadrant'.toLowerCase()]);
		var iImageLongEdge = parseInt(gmdConf['Glass Map Information']['Long Edge'.toLowerCase()]);
		
		this.m_iCenterMode = iCenterMode;
		this.m_iStartQuadrant = iStartQuadrant;
		this.m_iCutCorner = iCutCorner;
		this.m_dGlassSizeX = dGlassSizeX;
		this.m_dGlassSizeY = dGlassSizeY;
		this.m_iImageLongEdge = iImageLongEdge;

		if(dGlassSizeX > dGlassSizeY)
		{
			this.m_dLongEdgeSize = dGlassSizeX;
			this.m_dShortEdgeSize = dGlassSizeY;
			this.m_iGlassLongEdge = 0;
		}
		else
		{
			this.m_dLongEdgeSize = dGlassSizeY;
			this.m_dShortEdgeSize = dGlassSizeX;
			this.m_iGlassLongEdge = 1;
		}

		if(this.m_iImageLongEdge == this.m_iGlassLongEdge)
		{
			this.m_dGlassSizeX = dGlassSizeX;
			this.m_dGlassSizeY = dGlassSizeY;
		}
		else
		{
			this.m_dGlassSizeX = dGlassSizeY;
			this.m_dGlassSizeY = dGlassSizeX;
		}
    },
    
    FaviteCoordinateToCustomerCoordinate:function(dFavitePointX, dFavitePointY)
    {
    	var dCustomerPointX, dCustomerPointY;
    	var dTemp;

    	dCustomerPointX = dFavitePointX;
    	dCustomerPointY = dFavitePointY;

    	if(this.m_iStartQuadrant == 1 || this.m_iStartQuadrant == 2)
    	{
    		dCustomerPointY *= -1;
    	}

    	if(this.m_iStartQuadrant == 1 || this.m_iStartQuadrant == 4)
    	{
    		dCustomerPointX *= -1;
    	}

    	if(this.m_iCenterMode == 0)
    	{
    		dCustomerPointX += m_dGlassSizeX / 2;
    		dCustomerPointY += m_dGlassSizeY / 2;
    	}
    	else if(this.m_iCenterMode == 2)
    	{
    		if(this.m_dGlassSizeX < this.m_dGlassSizeY)
    		{
    			dCustomerPointX += this.m_dGlassSizeX / 2;
    		}
    		else
    		{
    			dCustomerPointY += this.m_dGlassSizeY / 2;
    		}
    	}
    	else if(this.m_iCenterMode == 3)
    	{
    		if(this.m_dGlassSizeX > this.m_dGlassSizeY)
    		{
    			dCustomerPointX += this.m_dGlassSizeX / 2;
    		}
    		else
    		{
    			dCustomerPointY += this.m_dGlassSizeY / 2;
    		}
    	}

    	if(this.m_iImageLongEdge != this.m_iGlassLongEdge)
    	{
    		dTemp = dCustomerPointX;
    		dCustomerPointX = dCustomerPointY;
    		dCustomerPointY = dTemp;
    	}

    	return {dCustomerPointX, dCustomerPointY};
    },

    CustomerCoordinateToFaviteCoordinate:function(dCustomerPointX, dCustomerPointY)
    {
    	var dFavitePointX, dFavitePointY;
    	var dTemp;

    	dFavitePointX = dCustomerPointX;
    	dFavitePointY = dCustomerPointY;

    	if(this.m_iImageLongEdge != this.m_iGlassLongEdge)
    	{
    		dTemp = dFavitePointX;
    		dFavitePointX = dFavitePointY;
    		dFavitePointY = dTemp;
    	}

    	if(this.m_iCenterMode == 0)
    	{
    		dFavitePointX -= this.m_dGlassSizeX / 2;
    		dFavitePointY -= this.m_dGlassSizeY / 2;
    	}
    	else if(this.m_iCenterMode == 2)
    	{
    		if(this.m_dGlassSizeX < this.m_dGlassSizeY)
    		{
    			dFavitePointX -= this.m_dGlassSizeX / 2;
    		}
    		else
    		{
    			dFavitePointY -= this.m_dGlassSizeY / 2;
    		}
    	}
    	else if(this.m_iCenterMode == 3)
    	{
    		if(this.m_dGlassSizeX > this.m_dGlassSizeY)
    		{
    			dFavitePointX -= this.m_dGlassSizeX / 2;
    		}
    		else
    		{
    			dFavitePointY -= this.m_dGlassSizeY / 2;
    		}
    	}

    	if(this.m_iStartQuadrant == 1 || this.m_iStartQuadrant == 2)
    	{
    		dFavitePointY *= -1;
    	}

    	if(this.m_iStartQuadrant == 1 || this.m_iStartQuadrant == 4)
    	{
    		dFavitePointX *= -1;
    	}

    	return {dFavitePointX, dFavitePointY};
    },
})

var BLOCK_MAP_MATRIX = Class.extend({
	init: function () {
		this.m_BlockMap = new Array();
	},
    
    IsInMap:function(iIPIndex, iScanIndex,iBlockIndex){
    	var iBlockMapXIndex, iBlockMapYIndex;
    	
    	for(var i = 0; i < this.iTotalBlockX; i ++){
    		for(var j = 0; j < this.iTotalBlockY; j ++){
    			if((this.m_BlockMap[i][j].iIPIndex == iIPIndex) && (this.m_BlockMap[i][j].iScanIndex == iScanIndex) && (this.m_BlockMap[i][j].iBlockIndex == iBlockIndex))
    			{
    				iBlockMapXIndex = i;
    				iBlockMapYIndex = j;
    				return {iBlockMapXIndex,iBlockMapYIndex};
    			}
    		}
    	}
    	
    	return null;
    },

    IsInMap:function(iInputX,iInputY){
    	var iOutputX, iOutputY, iBlockMapXIndex, iBlockMapYIndex;
    	
    	for(var i = 0; i < this.iTotalBlockX; i ++){
    		for(var j = 0; j < this.iTotalBlockY; j ++){
    			if(iInputX >= this.m_BlockMap[i][j].iRange_Left && iInputX <= this.m_BlockMap[i][j].iRange_Right && iInputY >= this.m_BlockMap[i][j].iRange_Bottom && iInputY <= this.m_BlockMap[i][j].iRange_Top)
    			{
    				iBlockMapXIndex = i;
    				iBlockMapYIndex = j;
    				
    				iOutputX = iInputX - m_BlockMap[i][j].iRange_Left;
    				iOutputY = iInputY - m_BlockMap[i][j].iRange_Bottom;
    				
    				return {iOutputX,iOutputY,iBlockMapXIndex,iBlockMapYIndex};
    			}
    		}
    	}
    	
    	return null;
    }
});

var COORDINATE_TRANSFER =  Class.extend({
    init: function (cameraConf,bifConf,padConf,panelName,gmdConf) {
    	this.mpMachinePara = new MACHINE_PARA(cameraConf,bifConf);
    	this.gmpGlassMapPara = new GLASS_MAP_PARA(padConf);
    	if(panelName != undefined)
    		this.pmpPanelMapPara = new PANEL_MAP_PARA(padConf,panelName);
    	
    	if(gmdConf)
    		this.giGlassInformationPara = new GLASS_INFORMATION(gmdConf);
    	
    },
    
    JudgeIPScan_Pixel:function(dInputX,dInputY)
    {
    	var iIP, iScan;
    	var iTotalIP;
    	var iTotalScan;
    	var iRange_Left;
    	var iRange_Right;
    	var iRange_Bottom;
    	var iRange_Top;

    	iTotalIP = this.mpMachinePara.iTotalIP;

    	for(var iIPIndex = iTotalIP - 1; iIPIndex >= 0; iIPIndex --)
    	{
    		iTotalScan = this.mpMachinePara.aIPParaArray[iIPIndex].iTotalScan;
    		for(var iScanIndex = iTotalScan - 1; iScanIndex >= 0; iScanIndex --)
    		{
    			iRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;
    			iRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Right;
    			iRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom;
    			iRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Top;

    			if((dInputX >= iRange_Left) && (dInputX <= iRange_Right) && (dInputY >= iRange_Bottom) && (dInputY <= iRange_Top))
    			{
    				iIP = iIPIndex;
    				iScan = iScanIndex;
    				return{iIP, iScan};
    			}
    		}
    	}

    	return {};
    },
    
    JudgeIPScan_UM:function(dInputX,dInputY)
    {
    	var iIP, iScan;
    	var iTotalIP = this.mpMachinePara.iTotalIP;
    	for(var iIPIndex = iTotalIP - 1; iIPIndex >= 0; iIPIndex --)
    	{
    		var iTotalScan = this.mpMachinePara.aIPParaArray[iIPIndex].iTotalScan;
    		for(var iScanIndex = iTotalScan - 1; iScanIndex >= 0; iScanIndex --)
    		{
    			var dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			var dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			var dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Bottom;
    			var dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Top;
    			
    			if((dInputX >= dRange_Left) && (dInputX <= dRange_Right) && (dInputY >= dRange_Bottom) && (dInputY <= dRange_Top))
    			{
    				iIP = iIPIndex;
    				iScan = iScanIndex;

    				return {iIP, iScan};
    			}
    		}
    	}
    	
    	return {};
    },
    
    JudgeIPScanUMStart: function(dInputX, dInputY){
    	var iIP = null, iScan = null;
    	var iTotalIP = this.mpMachinePara.iTotalIP;
    	
    	for(var iIPIndex = 0; iIPIndex < iTotalIP; iIPIndex++){
    		var iTotalScan = this.mpMachinePara.aIPParaArray[iIPIndex].iTotalScan;

    		for(var iScanIndex =  0; iScanIndex < iTotalScan; iScanIndex++){
    			var dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			var dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			var dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Bottom;
    			var dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Top;
    			
    			if((dInputX >= dRange_Left) && (dInputX <= dRange_Right) && (dInputY >= dRange_Bottom) && (dInputY <= dRange_Top)){
    				iIP = iIPIndex;
    				iScan = iScanIndex;
    			}
    		}
    	}
    	
    	return {iIP,iScan};
    },
    
    JudgeIPScanUM: function(dInputX, dInputY,iIPStart,iScanStart){
    	var iIP = null, iScan = null;
    	var iTotalIP = this.mpMachinePara.iTotalIP;
    	
    	for(var iIPIndex = iIPStart; iIPIndex < iTotalIP; iIPIndex++){
    		var iTotalScan = this.mpMachinePara.aIPParaArray[iIPIndex].iTotalScan;

    		for(var iScanIndex = (iIPIndex == iIPStart?iScanStart:0); iScanIndex < iTotalScan; iScanIndex++){
    			var dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Left;
    			var dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Right;
    			var dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Bottom;
    			var dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dRange_Top;
    			
    			if((dInputX >= dRange_Left) && (dInputX <= dRange_Right) && (dInputY >= dRange_Bottom) && (dInputY <= dRange_Top)){
    				iIP = iIPIndex;
    				iScan = iScanIndex;
    				
    				return {iIP,iScan};
    			}
    		}
    	}
    	
    	return {iIP,iScan};
    },
    
    UMCoordinateToBlockMapCoordinateStart: function(dInputX, dInputY){
    	let {iIP:iIPIndex,iScan:iScanIndex} = this.JudgeIPScanUMStart(dInputX, dInputY);
    	if(iIPIndex != null && iScanIndex != null)
    	{
    		var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		var dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		var iBlockHeight = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;
    		
    		var dOutputX = (dInputX - dOffsetX) / dResolutionX;
    		var dOutputY = Math.floor((dInputY - dOffsetY) / dResolutionY) % iBlockHeight;
    		var iBlockIndex = Math.floor(((dInputY - dOffsetY) / dResolutionY) / iBlockHeight);
    		
    		return {dOutputX,dOutputY,iIPIndex,iScanIndex,iBlockIndex};
    	}
    	
    	return {};
    },
    
    UMCoordinateToBlockMapCoordinate: function(dInputX, dInputY,iIPStart,iScanStart){
    	let {iIP:iIPIndex,iScan:iScanIndex} = this.JudgeIPScanUM(dInputX, dInputY,iIPStart,iScanStart);
    	if(iIPIndex != null && iScanIndex != null)
    	{
    		var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		var dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		var iBlockHeight = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;
    		
    		var dOutputX = (dInputX - dOffsetX) / dResolutionX;
    		var dOutputY = Math.floor((dInputY - dOffsetY) / dResolutionY) % iBlockHeight;
    		var iBlockIndex = Math.floor(((dInputY - dOffsetY) / dResolutionY) / iBlockHeight);
    		
    		return {dOutputX,dOutputY,iIPIndex,iScanIndex,iBlockIndex};
    	}
    	
    	return {};
    },
    
    InitialBlockMapMatrix:function(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop,isUM = false){
    	if(this.bmpBlockMapPara)
    		delete this.bmpBlockMapPara;
    	
    	this.bmpBlockMapPara = new BLOCK_MAP_MATRIX();

    	var iBlockMapXIndex;
    	var iBlockMapYIndex;
    	var dRangeLeft,dRangeBottom,dRangeRight,dRangeTop;
    	if(isUM){
    		dRangeLeft = iRangeLeft;
    		dRangeBottom = iRangeBottom;
    		dRangeRight =iRangeRight;
    		dRangeTop = iRangeTop;
    	}else{
    		let {dOutputX:dLeft, dOutputY:dBottom} = this.PanelMapCoordinateToUMCoordinate(iRangeLeft, iRangeBottom);
        	if(dLeft == undefined || dBottom == undefined)
        	{
        		return false;
        	}
        	dRangeLeft = dLeft;
    		dRangeBottom = dBottom;
        	
        	let {dOutputX:dRight, dOutputY:dTop} = this.PanelMapCoordinateToUMCoordinate(iRangeRight, iRangeTop);
        	if(dRight == undefined || dTop == undefined)
        	{
        		return false;
        	}
        	dRangeRight =dRight;
    		dRangeTop = dTop;
    	}
    	
    	let {iIPIndex:iIPIndex_BL, iScanIndex:iScanIndex_BL, iBlockIndex:iBlockIndex_BL} = this.UMCoordinateToBlockMapCoordinateStart(dRangeLeft, dRangeBottom);
    	
    	if(iIPIndex_BL == null )
    	{
    		return false;
    	}
    	
    	let {iIPIndex:iIPIndex_BR, iScanIndex:iScanIndex_BR, iBlockIndex:iBlockIndex_BR} = this.UMCoordinateToBlockMapCoordinate(dRangeRight, dRangeBottom,iIPIndex_BL,iScanIndex_BL);
    	
    	if(iIPIndex_BR == null)
    	{
    		return false;
    	}
    	if(iIPIndex_BR < iIPIndex_BL || ( iIPIndex_BR ==  iIPIndex_BL && iScanIndex_BR < iScanIndex_BL)){//by wft
    		iIPIndex_BL = iIPIndex_BR;
    		iScanIndex_BL = iScanIndex_BR;
    	}
    	
    	iBlockMapXIndex = 0;
    	this.bmpBlockMapPara.iTotalBlockX = 0;
    	this.bmpBlockMapPara.iTotalBlockY = 0;
    	
    	for(var iIPIndex = iIPIndex_BL; iIPIndex <= iIPIndex_BR; iIPIndex ++)
    	{
    		if(this.mpMachinePara.aIPParaArray[iIPIndex] == undefined)
    			continue;
    			
    		var iScanIndexMin;
    		var iScanIndexMax;
    		
    		if(iIPIndex == iIPIndex_BL)
    		{
    			iScanIndexMin = iScanIndex_BL;
    		}
    		else
    		{
    			iScanIndexMin = 0;
    		}
    		
    		if(iIPIndex == iIPIndex_BR)
    		{
    			iScanIndexMax = iScanIndex_BR;
    		}
    		else
    		{
    			iScanIndexMax = this.mpMachinePara.iTotalScan;
    		}
    		
    		for(var iScanIndex = iScanIndexMin; iScanIndex <= iScanIndexMax; iScanIndex ++)
    		{
    			if(this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex] == undefined)
        			continue;
    			
    			var ptTopPointX;
    			var ptTopPointY;
    			var ptBottomPointX;
    			var ptBottomPointY;

    			var iPreIPIndex;
    			var iPreScanIndex;
    			var iNextIPIndex;
    			var iNextScanIndex;
    			var isLeft = false;
    			
    			if(iIPIndex == iIPIndex_BL && iScanIndex == iScanIndex_BL)
    			{
    				ptBottomPointX = dRangeLeft;
    				ptTopPointX = dRangeLeft;
    			}
    			else if(iIPIndex == iIPIndex_BR && iScanIndex == iScanIndex_BR)
    			{
    				ptBottomPointX = dRangeRight;
    				ptTopPointX = dRangeRight;
    			}
    			else
    			{
    				if(iScanIndex == 0)
    				{
    					iPreIPIndex = iIPIndex - 1;
    					iPreScanIndex = this.mpMachinePara.iTotalScan - 1;
    				}
    				else
    				{
    					iPreIPIndex = iIPIndex;
    					iPreScanIndex = iScanIndex - 1;
    				}
    				
    				if(iScanIndex >= this.mpMachinePara.iTotalScan - 1)
    				{
    					iNextIPIndex = iIPIndex + 1;
    					iNextScanIndex = 0;
    				}
    				else
    				{
    					iNextIPIndex = iIPIndex;
    					iNextScanIndex = iScanIndex + 1;
    				}
    				
    				ptBottomPointX = (this.mpMachinePara.aIPParaArray[iPreIPIndex].aScanParaArray[iPreScanIndex].dRange_Right + this.mpMachinePara.aIPParaArray[iNextIPIndex].aScanParaArray[iNextScanIndex].dRange_Left) / 2;
    				ptTopPointX = (this.mpMachinePara.aIPParaArray[iPreIPIndex].aScanParaArray[iPreScanIndex].dRange_Right + this.mpMachinePara.aIPParaArray[iNextIPIndex].aScanParaArray[iNextScanIndex].dRange_Left) / 2;
    			}
    			
    			ptBottomPointY = dRangeBottom;
    			ptTopPointY = dRangeTop;
    
    			let {iIPIndex:iIPIndex_TopPoint, iScanIndex:iScanIndex_TopPoint, iBlockIndex:iBlockIndex_TopPoint} = this.UMCoordinateToBlockMapCoordinate(ptTopPointX, ptTopPointY,iIPIndex,iScanIndex);

    			if(iBlockIndex_TopPoint == null)
    			{
    				return false;
    			}

    			let {iIPIndex:iIPIndex_BottomPoint, iScanIndex:iScanIndex_BottomPoint, iBlockIndex:iBlockIndex_BottomPoint} = this.UMCoordinateToBlockMapCoordinate(ptBottomPointX,ptBottomPointY,iIPIndex,iScanIndex);

    			if(iBlockIndex_BottomPoint == null)
    			{
    				return false;
    			}
    			
    			
    			iBlockMapYIndex = 0;
    			this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex] = new Array();
    			
    			if(iIPIndex_BottomPoint == iIPIndex_TopPoint && iScanIndex_BottomPoint == iScanIndex_TopPoint)
    			{
    				for(var iBlockIndex = iBlockIndex_BottomPoint; iBlockIndex <= iBlockIndex_TopPoint; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;

    					iBlockMapYIndex ++;
    				}
    			}
    			else
    			{
    				for(var iBlockIndex = iBlockIndex_BottomPoint; iBlockIndex < this.mpMachinePara.iTotalBlock; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex_BottomPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex_BottomPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = this.mpMachinePara.aIPParaArray[iIPIndex_BottomPoint].aScanParaArray[iScanIndex_BottomPoint].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = this.mpMachinePara.aIPParaArray[iIPIndex_BottomPoint].aScanParaArray[iScanIndex_BottomPoint].iBlockHeight;

    					iBlockMapYIndex ++;
    				}

    				for(var iBlockIndex = 0; iBlockIndex <= iBlockIndex_TopPoint; iBlockIndex ++)
    				{
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex] = new Object();
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iIPIndex = iIPIndex_TopPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iScanIndex = iScanIndex_TopPoint;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockIndex = iBlockIndex;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapWidth = this.mpMachinePara.aIPParaArray[iIPIndex_TopPoint].aScanParaArray[iScanIndex_TopPoint].iScanWidth;
    					this.bmpBlockMapPara.m_BlockMap[iBlockMapXIndex][iBlockMapYIndex].iBlockMapHeight = this.mpMachinePara.aIPParaArray[iIPIndex_TopPoint].aScanParaArray[iScanIndex_TopPoint].iBlockHeight;

    					iBlockMapYIndex ++;
    				}
    			}
    			
    			if(iBlockMapYIndex >= this.bmpBlockMapPara.iTotalBlockY)
    			{
    				this.bmpBlockMapPara.iTotalBlockY = iBlockMapYIndex;
    			}
    			
    			iBlockMapXIndex ++;
    		}
    	}
    	
    	this.bmpBlockMapPara.iTotalBlockX = iBlockMapXIndex;
    },
    
    GetBlockMapMatrixBlockRangeUM:function(){
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			
    			var iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
    			var iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
    			var iBlockIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockIndex;

    			if(iIPIndex >= 0 && iIPIndex < this.mpMachinePara.iTotalIP && iScanIndex >= 0 && iScanIndex < this.mpMachinePara.iTotalScan && iBlockIndex >= 0 && iBlockIndex < this.mpMachinePara.iTotalBlock)
    			{
    				var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    				var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    				var iBlockMapWidth = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockMapWidth;
    				var iBlockMapHeight = this.bmpBlockMapPara.m_BlockMap[i][j].iBlockMapHeight;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY + dResolutionY * iBlockIndex * iBlockMapHeight;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX + dResolutionX * iBlockMapWidth;
    				this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY + dResolutionY * (iBlockIndex + 1) * iBlockMapHeight;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].iRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;//by wft
    				this.bmpBlockMapPara.m_BlockMap[i][j].iRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom + iBlockIndex * iBlockMapHeight;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iRange_Right = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left + iBlockMapWidth;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iRange_Top = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom + (iBlockIndex + 1) * iBlockMapHeight;
    			}
    		}
    	}
    },
    
    PanelMapCoordinateToUMCoordinate: function(iInputX, iInputY){
    	var dOutputX, dOutputY;
    	
    	if(this.pmpPanelMapPara.dRatioX == 0 || this.pmpPanelMapPara.dRatioY == 0)
    	{
    		return {};
    	}
    	else
    	{
    		
    		var dTempX = iInputX / this.pmpPanelMapPara.dRatioX + this.pmpPanelMapPara.dPanelMapLeft;
    		var dTempY = iInputY / this.pmpPanelMapPara.dRatioY + this.pmpPanelMapPara.dPanelMapBottom;
    		
    		let {iIP:iIPIndex, iScan:iScanIndex} = this.JudgeIPScan_Pixel(dTempX, dTempY);
    		if(iIPIndex == undefined || iScanIndex == undefined)
    			return {};

    		var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		var dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		var iRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;
    		var iRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom;

    		dOutputX = (dTempX - iRange_Left) * dResolutionX + dOffsetX;
    		dOutputY = (dTempY - iRange_Bottom) * dResolutionY + dOffsetY;
    		return {dOutputX,dOutputY};
    	}
    },
    
    UMCoordinateToPanelMapCoordinate:function(dInputX,dInputY)
    {
    	var dOutputX, dOutputY;
    	let {iIP:iIPIndex, iScan:iScanIndex} = this.JudgeIPScan_UM(dInputX, dInputY);
    	
    	if(iIPIndex != undefined && iScanIndex != undefined)
    	{
    		var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		var dOffsetY =  this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		var dResolutionX =  this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		var dResolutionY =  this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		var iRange_Left =  this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;
    		var iRange_Bottom =  this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom;
    		
    		dOutputX = ((dInputX - dOffsetX) / dResolutionX + iRange_Left - this.pmpPanelMapPara.dPanelMapLeft) * this.pmpPanelMapPara.dRatioX;
    		dOutputY = ((dInputY - dOffsetY) / dResolutionY + iRange_Bottom - this.pmpPanelMapPara.dPanelMapBottom) * this.pmpPanelMapPara.dRatioY;
    	}
    	
    	return {dOutputX, dOutputY};
    },
    
    UMCoordinateToGlassMapCoordinate:function(dInputX,dInputY)
    {
    	var dOutputX, dOutputY;
    	let {iIP:iIPIndex, iScan:iScanIndex} = this.JudgeIPScan_UM(dInputX, dInputY);
    	if(iIPIndex != undefined && iScanIndex != undefined)
    	{
    		var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    		var dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    		var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    		var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    		var iRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;
    		var iRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom;
    		
    		dOutputX = ((dInputX - dOffsetX) / dResolutionX + iRange_Left) * this.gmpGlassMapPara.dRatioX;
    		dOutputY = ((dInputY - dOffsetY) / dResolutionY + iRange_Bottom) * this.gmpGlassMapPara.dRatioY;
    		
    		return {dOutputX, dOutputY};
    	}
    	
    	return {};
    },
    
    BlockMapCoordinateToUMCoordinate:function(iInputX,iInputY,iIPIndex,iScanIndex,iBlockIndex)
    {
    	var dOutputX, dOutputY;

    	var dOffsetX = mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    	var dOffsetY = mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    	var dResolutionX = mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    	var dResolutionY = mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    	var iBlockHeight = mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iBlockHeight;
    	
    	dOutputX = iInputX * dResolutionX + dOffsetX;
    	dOutputY = (iInputY + iBlockIndex * iBlockHeight) * dResolutionY + dOffsetY;
    	
    	return {dOutputX, dOutputY};
    },
    
    GetTwoRectInter: function(rtA_BottomLeftX,rtA_BottomLeftY,rtA_TopRightX,rtA_TopRightY,rtB_BottomLeftX,rtB_BottomLeftY,rtB_TopRightX,rtB_TopRightY){
    	var rtInter_BottomLeftX, rtInter_BottomLeftY, rtInter_TopRightX, rtInter_TopRightY;
    	if(rtA_BottomLeftX >= rtB_BottomLeftX && rtA_BottomLeftY >= rtB_BottomLeftY && rtA_TopRightX <= rtB_TopRightX && rtA_TopRightY <= rtB_TopRightY)
    	{
    		rtInter_BottomLeftX = rtA_BottomLeftX;
    		rtInter_BottomLeftY = rtA_BottomLeftY;
    		rtInter_TopRightX = rtA_TopRightX;
    		rtInter_TopRightY = rtA_TopRightY;
    	}
    	else if(rtA_BottomLeftX <= rtB_BottomLeftX && rtA_BottomLeftY <= rtB_BottomLeftY && rtA_TopRightX >= rtB_TopRightX && rtA_TopRightY >= rtB_TopRightY)
    	{
    		rtInter_BottomLeftX = rtB_BottomLeftX;
    		rtInter_BottomLeftY = rtB_BottomLeftY;
    		rtInter_TopRightX = rtB_TopRightX;
    		rtInter_TopRightY = rtB_TopRightY;
    	}
    	else if(rtB_TopRightX < rtA_BottomLeftX || rtB_TopRightY < rtA_BottomLeftY || rtB_BottomLeftX > rtA_TopRightX || rtB_BottomLeftY > rtA_TopRightY)
    	{
    		return {};
    	}
    	else
    	{
    		if(rtA_BottomLeftX < rtB_TopRightX && rtA_BottomLeftX > rtB_BottomLeftX)
    		{
    			rtInter_BottomLeftX = rtA_BottomLeftX;
    		}
    		else
    		{
    			rtInter_BottomLeftX = rtB_BottomLeftX;
    		}

    		if(rtA_TopRightX > rtB_BottomLeftX && rtA_TopRightX < rtB_TopRightX)
    		{
    			rtInter_TopRightX = rtA_TopRightX;
    		}
    		else
    		{
    			rtInter_TopRightX = rtB_TopRightX;
    		}

    		if(rtA_BottomLeftY < rtB_TopRightY && rtA_BottomLeftY > rtB_BottomLeftY)
    		{
    			rtInter_BottomLeftY = rtA_BottomLeftY;
    		}
    		else
    		{
    			rtInter_BottomLeftY = rtB_BottomLeftY;
    		}

    		if(rtA_TopRightY > rtB_BottomLeftY && rtA_TopRightY < rtB_TopRightY)
    		{
    			rtInter_TopRightY = rtA_TopRightY;
    		}
    		else
    		{
    			rtInter_TopRightY = rtB_TopRightY;
    		}
    	}

    	if((rtInter_TopRightX - rtInter_BottomLeftX) <= 0 || (rtInter_TopRightY - rtInter_BottomLeftY) <= 0)
    	{
    		return {};
    	}
    	
    	
    	return {rtInter_BottomLeftX, rtInter_BottomLeftY, rtInter_TopRightX, rtInter_TopRightY};
    },
    
    GetRectIntersectionInfoInBlockMapMatrix:function(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop,isUM=false){

    	var dBlockRangeLeft;
    	var dBlockRangeBottom;
    	var dBlockRangeRight;
    	var dBlockRangeTop;

    	var iBlockMapXIndex;
    	var iBlockMapYIndex;
    	var iIPIndex;
    	var iScanIndex;
    	var dResolutionX;
    	var dResolutionY;
    	var iStartX;
    	var iStartY;
    	var iEndX;
    	var iEndY;
    	var iWidth;
    	var iHeight;
    	
    	this.InitialBlockMapMatrix(iRangeLeft,iRangeBottom, iRangeRight,iRangeTop,isUM);
    	this.GetBlockMapMatrixBlockRangeUM();
    	
    	var dRangeLeft,dRangeBottom,dRangeRight,dRangeTop;
    	if(isUM){
    		dRangeLeft = iRangeLeft;
    		dRangeBottom = iRangeBottom;
    		dRangeRight =iRangeRight;
    		dRangeTop = iRangeTop;
    	}else{
    		let {dOutputX:dLeft, dOutputY:dBottom} = this.PanelMapCoordinateToUMCoordinate(iRangeLeft, iRangeBottom);
        	if(dLeft == undefined || dBottom == undefined)
        	{
        		return false;
        	}
        	dRangeLeft = dLeft;
    		dRangeBottom = dBottom;
        	
        	let {dOutputX:dRight, dOutputY:dTop} = this.PanelMapCoordinateToUMCoordinate(iRangeRight, iRangeTop);
        	if(dRight == undefined || dTop == undefined)
        	{
        		return false;
        	}
        	dRangeRight =dRight;
    		dRangeTop = dTop;
    	}
    	
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			dBlockRangeLeft = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left;
    			dBlockRangeBottom = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom;
    			dBlockRangeRight = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right;
    			dBlockRangeTop = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top;

    			let {rtInter_BottomLeftX:dInterRangeLeft, rtInter_BottomLeftY:dInterRangeBottom, rtInter_TopRightX:dInterRangeRight, rtInter_TopRightY:dInterRangeTop} = this.GetTwoRectInter(dRangeLeft, dRangeBottom, dRangeRight, dRangeTop, dBlockRangeLeft, dBlockRangeBottom, dBlockRangeRight, dBlockRangeTop);

    			if(dInterRangeLeft != undefined)
    			{
    				iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
    				iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
    				dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    				dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    				
    				iStartX = Math.floor((dInterRangeLeft - dBlockRangeLeft) / dResolutionX + 0.5);
    				iStartY = Math.floor((dInterRangeBottom - dBlockRangeBottom) / dResolutionY + 0.5);
    				iEndX = Math.floor((dInterRangeRight - dBlockRangeLeft) / dResolutionX + 0.5);
    				iEndY = Math.floor((dInterRangeTop - dBlockRangeBottom) / dResolutionY + 0.5);
    				
    				if(i > 0 && this.bmpBlockMapPara.m_BlockMap[i-1][j] != undefined){//by wft
    					this.bmpBlockMapPara.m_BlockMap[i-1][j].iInterSectionWidth -= this.bmpBlockMapPara.m_BlockMap[i-1][j].iRange_Right - this.bmpBlockMapPara.m_BlockMap[i][j].iRange_Left
    				}
    					
    				
    				iWidth = iEndX - iStartX;
    				iHeight = iEndY - iStartY;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartX = iStartX;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartY = iStartY;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionWidth = iWidth;
    				this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionHeight = iHeight;
    				
    				this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection = true;
    			}
    			else
    			{
    				this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection = false;
    			}
    		}
    	}
    	
    	return true;
    },
    
    UMCoordinateToHawkmapCoordinate:function(dInputX,dInputY){
    	var iOutputX = 0, iOutputY = 0;
    	
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			if(this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection == false)
    				continue;
    			
    			var dBlockRangeLeft = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left;
    			var dBlockRangeBottom = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom;
    			var dBlockRangeRight = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right;
    			var dBlockRangeTop = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top;
    			
    			if(dInputX < dBlockRangeLeft || dInputX > dBlockRangeRight || 
    					dInputY < dBlockRangeBottom || dInputY >  dBlockRangeTop){
    				iOutputY += this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionHeight;
    				continue;
    			}
    			
    			var iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
				var iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
				var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
				var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    			
    			iOutputX += (dInputX - dBlockRangeLeft) / dResolutionX + 0.5;
    			iOutputY += (dInputY - dBlockRangeBottom) / dResolutionY + 0.5;
    			iOutputX -= this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartX;
    			iOutputY -= this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartY;
    			
    			return {iOutputX, iOutputY};
    			
    		}
    		iOutputY = 0;
    		iOutputX += this.bmpBlockMapPara.m_BlockMap[i][0].iInterSectionWidth;

    	}
    	
    	return {};
    },
    
    HawkmapCoordinateToUMCoordinate:function(iInputX,iInputY){
    	var dOutputX, dOutputY;
    	var iStartX = 0,iStartY = 0;
    	for(var i = 0; i < this.bmpBlockMapPara.iTotalBlockX; i ++)
    	{
    		iStartX += this.bmpBlockMapPara.m_BlockMap[i][0].iInterSectionWidth;
    		for(var j = 0; j < this.bmpBlockMapPara.iTotalBlockY; j ++)
    		{
    			if(this.bmpBlockMapPara.m_BlockMap[i][j] == undefined)
    				continue;
    			if(this.bmpBlockMapPara.m_BlockMap[i][j].bHasIntersection == false)
    				continue;
    			iStartY += this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionHeight;
    			
    			if(iInputX > iStartX || iInputY > iStartY)
    				continue;
    			
    			var iInterSectionStartX = this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartX;
    			var iInterSectionStartY = this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionStartY;
    			var iInterSectionWidth = this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionWidth;
    			var iInterSectionHeight = this.bmpBlockMapPara.m_BlockMap[i][j].iInterSectionHeight;

    			var dBlockRangeLeft = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Left;
    			var dBlockRangeBottom = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Bottom;
    			var dBlockRangeRight = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Right;
    			var dBlockRangeTop = this.bmpBlockMapPara.m_BlockMap[i][j].dRange_Top;
    			
    			var iIPIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iIPIndex;
				var iScanIndex = this.bmpBlockMapPara.m_BlockMap[i][j].iScanIndex;
				var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
				var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    			
				dOutputX = iInterSectionStartX + iInterSectionWidth -(iStartX - iInputX);
    			dOutputX = dOutputX * dResolutionX + dBlockRangeLeft;
    			
    			dOutputY = iInterSectionStartY + iInterSectionHeight -(iStartY - iInputY);
    			dOutputY = dOutputY * dResolutionY + dBlockRangeBottom;

    			return {dOutputX, dOutputY};
    			
    		}
    		iStartY = 0;
    		
    	}
    	
    	return {};
    },
    
    GlassMapCoordinateToUMCoordinate:function(iInputX,iInputY)
    {
    	var dOutputX, dOutputY;

    	if(this.gmpGlassMapPara.dRatioX != 0 && this.gmpGlassMapPara.dRatioY != 0){
    		var dTempX = iInputX / this.gmpGlassMapPara.dRatioX;
    		var dTempY = iInputY / this.gmpGlassMapPara.dRatioY;
    		
    		let {iIP:iIPIndex,iScan:iScanIndex} = this.JudgeIPScan_Pixel(dTempX, dTempY);
    		
    		if(iIPIndex != undefined)
    		{
    			var dOffsetX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetX;
    			var dOffsetY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dOffsetY;
    			var dResolutionX = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionX;
    			var dResolutionY = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].dResolutionY;
    			var iRange_Left = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Left;
    			var iRange_Bottom = this.mpMachinePara.aIPParaArray[iIPIndex].aScanParaArray[iScanIndex].iRange_Bottom;
    			
    			dOutputX = (iInputX / this.gmpGlassMapPara.dRatioX - iRange_Left) * dResolutionX + dOffsetX;
    			dOutputY = (iInputY / this.gmpGlassMapPara.dRatioY - iRange_Bottom) * dResolutionY + dOffsetY;
    			
    			return {dOutputX, dOutputY};
    		}
    	}
    	
    	return {};
    },
    

    UmCoordinateToCustomerCoordinate:function(dInputX,dInputY){
    	let {dOutputX:dFaviteX, dOutputY:dFaviteY} = this.UmCoordinateToFaviteCoordinate(dInputX, dInputY);
    	
    	if(dFaviteX === undefined || dFaviteY === undefined )
    	{
    		return {};
    	}
    	
    	return this.giGlassInformationPara.FaviteCoordinateToCustomerCoordinate(dFaviteX, dFaviteY);
    },
    
    CustomerCoordinateToUmCoordinate: function(dInputX, dInputY){
    	let {dFavitePointX, dFavitePointY} = this.giGlassInformationPara.CustomerCoordinateToFaviteCoordinate(dInputX, dInputY);
    	return this.FaviteCoordinateToUmCoordinate(dFavitePointX, dFavitePointY);
    },
    UmCoordinateToFaviteCoordinate:function(dInputX,dInputY)
    {
    	if(this.mpMachinePara.dGlassCenterX == 0 && this.mpMachinePara.dGlassCenterY == 0)
    	{
    		return {};
    	}
    	
    	var dOutputX = (dInputX -this.mpMachinePara.dGlassCenterX) * Math.cos(this.mpMachinePara.dAngle) + (dInputY - this.mpMachinePara.dGlassCenterY) * Math.sin(this.mpMachinePara.dAngle);
    	var dOutputY = -(dInputX - this.mpMachinePara.dGlassCenterX) * Math.sin(this.mpMachinePara.dAngle) + (dInputY - this.mpMachinePara.dGlassCenterY) * Math.cos(this.mpMachinePara.dAngle);
    	
    	return {dOutputX,dOutputY};
    },
    FaviteCoordinateToUmCoordinate:function(dInputX,dInputY)
    {
    	var dTempX;
    	var dTempY;
    	
    	if(this.mpMachinePara.dGlassCenterX == 0 && this.mpMachinePara.dGlassCenterY == 0)
    	{
    		return {};
    	}
    	
    	dTempX = dInputX * Math.cos(-this.mpMachinePara.dAngle) + dInputY * Math.sin(-this.mpMachinePara.dAngle);
    	dTempY = -dInputX * Math.sin(-this.mpMachinePara.dAngle) + dInputY * Math.cos(-this.mpMachinePara.dAngle);
    	
    	var dOutputX = dTempX + this.mpMachinePara.dGlassCenterX;
    	var dOutputY = dTempY + this.mpMachinePara.dGlassCenterY;
    	
    	return {dOutputX,dOutputY};
    }
   
});



return COORDINATE_TRANSFER;

});

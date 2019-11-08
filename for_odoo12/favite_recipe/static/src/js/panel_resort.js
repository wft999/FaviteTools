odoo.define('favite_gmd.PanelResort', function (require) {
"use strict";

var core = require('web.core');
var Dialog = require('web.Dialog');

function IntIndexToStrIndex(iIndex){
	var strtemp;
	var temp;
	
	if(0 < iIndex && iIndex < 10)
	{
		strtemp = iIndex.toString();
	}
	else if(10 <= iIndex && iIndex <= 17)
	{
		temp = iIndex - 10 + 65;
		strtemp = String.fromCharCode(temp);
	}
	else if(18 <= iIndex && iIndex <= 22)
	{
		temp = iIndex - 10 + 65;
		strtemp = String.fromCharCode(temp+1);
	}
	else if(23 <= iIndex && iIndex <= 33)
	{
		temp = iIndex - 10 + 65;
		strtemp = String.fromCharCode(temp+2);
	}
	else
	{
		strtemp = '0';
	}
	
	return strtemp;
}

function StrIndexToIntIndex(strIndex){
	var strtemp;
	var str;
	var temp;
	
	strIndex.Trim();
	
	temp = strIndex.charCodeAt(0);
	
	if(49 <= temp && temp <= 57)
	{
		return temp - 48;
	}
	else if(65 <= temp && temp <= 72)
	{
		return temp - 65 + 10;
	}
	else if(73 <= temp && temp <= 78)
	{
		return temp - 65 + 10 - 1;
	}
	else if(79 <= temp && temp <= 90)
	{
		return temp - 65 + 10 - 2;
	}
	else
	{
		return 0;
	}
}


function ResortPanelID(geo,first_panel_mode, dir ,range ,iStartPos){
	var tol;
	var width;
	var height;
	var panel_count;

	var temp_index;
	var quarant;
	var imageEdge;
	var glassEdge;
	var iCenterMode;
	var iGlassCorner;
	
	panel_count = 0;
	panel_count = _.reduce(geo.block.objs,(count,b)=>{return count + b.panels.length},0);
	if(panel_count <= 0)
	{
		return;
	}
	
	tol = _.min(_.map(geo.block.objs,b=>{return Math.min(Math.abs(b.points[0].x-b.points[1].x),Math.abs(b.points[0].y-b.points[1].y))}))/2;
	
	iCenterMode = geo.glass.iCenterMode;
	imageEdge = geo.glass.iLongEdge; 
	quarant = geo.glass.iStartQuandrant;
	iGlassCorner = geo.glass.corner;
	quarant -= 1;
	
	if(geo.glass.size[0] > geo.glass.size[1])
	{
		glassEdge = 0;
	}
	else
	{
		glassEdge = 1;
	}
	
	if(imageEdge == glassEdge)
	{
		switch(quarant)
		{
		case 0:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 3;
				break;
			case 1:
				iStartPos = 1;
				break;
			case 2:
				iStartPos = 2;
				break;
			case 3:
				iStartPos = 0;
				break;
			}
			break;
		case 1:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 1;
				break;
			case 1:
				iStartPos = 3;
				break;
			case 2:
				iStartPos = 0;
				break;
			case 3:
				iStartPos = 2;
				break;
			}
			break;
		case 2:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 0;
				break;
			case 1:
				iStartPos = 2;
				break;
			case 2:
				iStartPos = 1;
				break;
			case 3:
				iStartPos = 3;
				break;
			}
			break;
		case 3:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 2;
				break;
			case 1:
				iStartPos = 0;
				break;
			case 2:
				iStartPos = 3;
				break;
			case 3:
				iStartPos = 1;
				break;
			}
			break;
		}
	}
	else
	{
		switch(quarant)
		{
		case 0:
			break;
		case 1:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 1;
				break;
			case 1:
				iStartPos = 0;
				break;
			case 2:
				iStartPos = 3;
				break;
			case 3:
				iStartPos = 2;
				break;
			}
			break;
		case 2:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 3;
				break;
			case 1:
				iStartPos = 2;
				break;
			case 2:
				iStartPos = 1;
				break;
			case 3:
				iStartPos = 0;
				break;
			}
			break;
		case 3:
			switch(iStartPos)
			{
			case 0:
				iStartPos = 2;
				break;
			case 1:
				iStartPos = 3;
				break;
			case 2:
				iStartPos = 0;
				break;
			case 3:
				iStartPos = 1;
				break;
			}
			break;
		}
	}
	
	if(range == 0){	
		_.each(geo.block.objs,function(b){
			var panel_count = b.panels.length;
			var index_list = [];
			for(var i = 0; i < panel_count; i ++){
				index_list.push(i);
			}
			
			var m,n;
			var start_index_x = b.panel_start_id_x;
			var start_index_y = b.panel_start_id_y;
			
			function panel_sort_bxy(it,comp){
				for(var j = 0; j < panel_count - 1; j ++){
					for(var k = j + 1; k < panel_count; k ++){
						var r;
						if(it == 'x'){
							var j_center_x = (b.panels[index_list[j]].points[0].x + b.panels[index_list[j]].points[1].x)/2;
							var k_center_x = (b.panels[index_list[k]].points[0].x + b.panels[index_list[k]].points[1].x)/2;
							r = eval('j_center_x '+comp+' k_center_x');
						}else{
							var j_center_x = (b.panels[index_list[j]].points[0].x + b.panels[index_list[j]].points[1].x)/2;
							var k_center_x = (b.panels[index_list[k]].points[0].x + b.panels[index_list[k]].points[1].x)/2;
							var j_center_y = (b.panels[index_list[j]].points[0].y + b.panels[index_list[j]].points[1].y)/2;
							var k_center_y = (b.panels[index_list[k]].points[0].y + b.panels[index_list[k]].points[1].y)/2;
							var abs = Math.abs(j_center_x - k_center_x);
							r = eval('j_center_y '+comp+' k_center_y');
							r = r && abs < tol;
						}
						if(r){
							temp_index = index_list[j];
							index_list[j] = index_list[k];
							index_list[k] = temp_index;
						}
					}
				}
			}
			
			if(dir == 0){
				switch(iStartPos){
				case 0:
					panel_sort_bxy('x','>');
					panel_sort_bxy('y','<');
					break;
				case 1:
					panel_sort_bxy('x','>');
					panel_sort_bxy('y','>');
					break;
				case 2:
					panel_sort_bxy('x','<');
					panel_sort_bxy('y','<');
					break;
				case 3:
					panel_sort_bxy('x','<');
					panel_sort_bxy('y','>');
					break;
				default:
					break;
				}
			}else{
				switch(iStartPos){
				case 0:
					panel_sort_bxy('y','<');
					panel_sort_bxy('x','>');
					break;
				case 1:
					panel_sort_bxy('y','>');
					panel_sort_bxy('x','>');
					break;
				case 2:
					panel_sort_bxy('y','<');
					panel_sort_bxy('x','<');
					break;
				case 3:
					panel_sort_bxy('y','>');
					panel_sort_bxy('x','<');
					break;
				default:
					break;
				}
			}
			
			for(var  j = 0; j < panel_count; j ++)
			{
				if(dir == 0)
				{
					m = Math.floor(j / b.col);
					n = j % b.row;
					m = m + parseInt(start_index_x);
					n = n + parseInt(start_index_y);
				}
				else
				{
					m = Math.floor(j / b.col);
					n = j % b.row;
					m = m + parseInt(start_index_x);
					n = n + parseInt(start_index_y);
				}
				
				var temp = IntIndexToStrIndex(m);
				temp = temp + IntIndexToStrIndex(n);
				
				b.panels[index_list[j]].panel_index = temp;
				b.panels[index_list[j]].label = temp.toString();
			}
		});
	}else{
		var panels = _.union(..._.map(geo.block.objs,o=>o.panels));
		var panel_count = panels.length;
		var index_list = [];
		for(var i = 0; i < panel_count; i ++){
			index_list.push(i);
		}
		
		function panel_sort_bxy(it,comp){
			for(var j = 0; j < panel_count - 1; j ++){
				for(var k = j + 1; k < panel_count; k ++){
					var r;
					if(it == 'x'){
						var j_center_x = (panels[index_list[j]].points[0].x + panels[index_list[j]].points[1].x)/2;
						var k_center_x = (panels[index_list[k]].points[0].x + panels[index_list[k]].points[1].x)/2;
						r = eval('j_center_x '+comp+' k_center_x');
					}else{
						var j_center_x = (panels[index_list[j]].points[0].x + panels[index_list[j]].points[1].x)/2;
						var k_center_x = (panels[index_list[k]].points[0].x + panels[index_list[k]].points[1].x)/2;
						var j_center_y = (panels[index_list[j]].points[0].y + panels[index_list[j]].points[1].y)/2;
						var k_center_y = (panels[index_list[k]].points[0].y + panels[index_list[k]].points[1].y)/2;
						var abs = Math.abs(j_center_x - k_center_x);
						r = eval('j_center_y '+comp+' k_center_y');
						r = r && abs < tol;
					}
					if(r){
						temp_index = index_list[j];
						index_list[j] = index_list[k];
						index_list[k] = temp_index;
					}
				}
			}
		}
		
		if(dir == 0){
			switch(iStartPos){
			case 0:
				panel_sort_bxy('x','>');
				panel_sort_bxy('y','<');
				break;
			case 1:
				panel_sort_bxy('x','>');
				panel_sort_bxy('y','>');
				break;
			case 2:
				panel_sort_bxy('x','<');
				panel_sort_bxy('y','<');
				break;
			case 3:
				panel_sort_bxy('x','<');
				panel_sort_bxy('y','>');
				break;
			default:
				break;
			}
		}else{
			switch(iStartPos){
			case 0:
				panel_sort_bxy('y','<');
				panel_sort_bxy('x','>');
				break;
			case 1:
				panel_sort_bxy('y','>');
				panel_sort_bxy('x','>');
				break;
			case 2:
				panel_sort_bxy('y','<');
				panel_sort_bxy('x','<');
				break;
			case 3:
				panel_sort_bxy('y','>');
				panel_sort_bxy('x','<');
				break;
			default:
				break;
			}
		}
		
		var panel_count_x = 0;
		var panel_count_y = 0;
		
		for(var i = 0; i < panel_count; i ++)
		{
			if(dir == 0)
			{
				var j_center_x = (panels[index_list[i]].points[0].x + panels[index_list[i]].points[1].x)/2;
				var k_center_x = (panels[index_list[i+1]].points[0].x + panels[index_list[i+1]].points[1].x)/2;
				var abs = Math.abs(j_center_x - k_center_x);
				if(i == panel_count - 1)	//说明只有一行或一列
				{
					panel_count_y = panel_count;
					panel_count_x = panel_count / panel_count_y;
					break;
				}
				else if(abs < tol)
				{
					panel_count_y ++;
				}
				else
				{
					panel_count_y += 1;
					panel_count_x = panel_count / panel_count_y;
					break;
				}
			}
			else
			{
				var j_center_y = (panels[index_list[i]].points[0].y + panels[index_list[i]].points[1].y)/2;
				var k_center_y = (panels[index_list[i+1]].points[0].y + panels[index_list[i+1]].points[1].y)/2;
				var abs = Math.abs(j_center_y - k_center_y);
				if(i == panel_count - 1)	//说明只有一行或一列
				{
					panel_count_x = panel_count;
					panel_count_y = panel_count / panel_count_x;
					break;
				}
				else if(abs < tol)
				{
					panel_count_x ++;
				}
				else
				{
					panel_count_x += 1;
					panel_count_y = panel_count / panel_count_x;
					break;
				}
			}
		}
		
		var m,n;
		for(var j = 0; j < panel_count; j ++)
		{
			if(dir == 0)
			{
				m = Math.floor(j / panel_count_y);
				n = j % panel_count_y;
			}
			else
			{
				m = Math.floor(j / panel_count_x);
				n = j % panel_count_x;
			}
			
			var temp = IntIndexToStrIndex(m + 1);
			temp = temp + IntIndexToStrIndex(n + 1);
			
			panels[index_list[j]].panel_index = temp;
			panels[index_list[j]].label = temp.toString();
			
			//m_pGlassInformation->m_PanelExtraData[index_list[j]].panel_id = temp;
			//m_pGlassInformation->m_PanelExtraData[index_list[j]].panel_index = j + 1;
		}
		

	}
}



function getNeedSwitch(first_panel_mode,dir,tol,centerx,centery,centerx1,centery1){
	var needswitch;
	switch(first_panel_mode)
	{
	case 0:
		if(dir <= 0)	//y 方向优先
		{
			if(centery - centery1 > tol || (Math.abs(centery - centery1) < tol && centerx > centerx1))
			{
				needswitch = true;
			}
		}
		else			//x 方向优先
		{
			if(centerx - centerx1 > tol || (Math.abs(centerx - centerx1) < tol && centery > centery1))
			{
				needswitch = true;
			}
		}
		break;
	case 1:
		if(dir <= 0)	//y 方向优先
		{
			if(centery1 - centery > tol || (Math.abs(centery1 - centery) < tol && centerx > centerx1))
			{
				needswitch = true;
			}
		}
		else			//x 方向优先
		{
			if(centerx - centerx1 > tol || (Math.abs(centerx - centerx1) < tol && centery1 > centery))
			{
				needswitch = true;
			}
		}
		break;
	case 2:
		if(dir <= 0)	//y 方向优先
		{
			if(centery - centery1 > tol || (Math.abs(centery - centery1) < tol && centerx1 > centerx))
			{
				needswitch = true;
			}
		}
		else			//x 方向优先
		{
			if(centerx1 - centerx > tol || (Math.abs(centerx1 - centerx) < tol && centery > centery1))
			{
				needswitch = true;
			}
		}
		break;
	case 3:
		if(dir <= 0)	//y 方向优先
		{
			if(centery1 - centery > tol || (Math.abs(centery1 - centery) < tol && centerx1 > centerx))
			{
				needswitch = true;
			}
		}
		else			//x 方向优先
		{
			if(centerx1 - centerx > tol || (Math.abs(centerx1 - centerx) < tol && centery1 > centery))
			{
				needswitch = true;
			}
		}
		break;
	default:
		if(dir <= 0)	//y 方向优先
		{
			if(centery - centery1 > tol || (Math.abs(centery - centery1) < tol && centerx > centerx1))
			{
				needswitch = true;
			}
		}
		else			//x 方向优先
		{
			if(centerx - centerx1 > tol || (Math.abs(centerx - centerx1) < tol && centery > centery1))
			{
				needswitch = true;
			}
		}
	}
	
	return needswitch;
}



//first _panel _mode: 0: index随着x递增，index随着y递增；1:  index随着x递增，index随着y递减；
//2:  index随着x递减，index随着y递增； 3: index随着x递减, y递减
function ResortPanelIndex(geo,first_panel_mode, dir, range){
	var panel_num;
	//var i;
	var panel_count;
	var tol;
	var width;
	var height;
	//var j;
	//var k;
	//var panel_count_x;
	//var panel_count_y;
	var centerx;
	var centery;
	var centerx1;
	var centery1;
	var imageEdge;
	var glassEdge;
	var iCenterMode;
	var iStartQuandrant;
	var iGlassCorner;
	//var needswitch;
//	GLASS_INFORMATION tempGI;
	var index_list=[];
	var temp_index;
	
	iCenterMode = geo.glass.iCenterMode;
	imageEdge = geo.glass.iLongEdge; 
	iStartQuandrant = geo.glass.iStartQuandrant;
	iGlassCorner = geo.glass.corner;

	glassEdge = geo.glass.size[0] > geo.glass.size[1] ? 0 : 1;
	
	panel_num = 0;
	panel_count = _.reduce(geo.block.objs,(count,b)=>{return count + b.panels.length},0);
	
	if(panel_count <= 0){
		return;
	}
	
	tol = _.min(_.map(geo.block.objs,b=>{return Math.min(Math.abs(b.points[0].x-b.points[1].x),Math.abs(b.points[0].y-b.points[1].y))}))/2;
	
	function sort_panel(panels,panel_start_id){
		var panel_count = panels.length;
		var index_list = [];
		for(var i = 0; i < panel_count; i ++){
			index_list.push({id:i});
		}
		for(var j = 0; j < panel_count - 1; j ++){
			for(var k = j + 1; k < panel_count; k ++){
				var needswitch = false;
				if(index_list[j].center_x === undefined){
					index_list[j].center_x = (panels[j].points[0].x + panels[j].points[1].x)/2;
					index_list[j].center_y = (panels[j].points[0].y + panels[j].points[1].y)/2;
				}
				
				if(index_list[k].center_x === undefined){
					index_list[k].center_x = (panels[k].points[0].x + panels[k].points[1].x)/2;
					index_list[k].center_y = (panels[k].points[0].y + panels[k].points[1].y)/2;
				}
				
				if(imageEdge == glassEdge){
					centerx = index_list[j].center_x;
					centery = index_list[j].center_y;
					centerx1 = index_list[k].center_x;
					centery1 = index_list[k].center_y;
				}
				else{
					centery = index_list[j].center_x;
					centerx = index_list[j].center_y;
					centery1 = index_list[k].center_x;
					centerx1 = index_list[k].center_y;
				}
				
				needswitch = getNeedSwitch(first_panel_mode,dir,tol,centerx,centery,centerx1,centery1);
				
				if(needswitch)
				{
					temp_index = index_list[j].id;
					index_list[j].id = index_list[k].id;
					index_list[k].id = temp_index;
					
					if(imageEdge == glassEdge)
					{
						index_list[j].center_x = centerx1;
						index_list[j].center_y = centery1;
						index_list[k].center_x = centerx;
						index_list[k].center_y = centery;
					}
					else
					{
						index_list[j].center_y = centerx1;
						index_list[j].center_x = centery1;
						index_list[k].center_y = centerx;
						index_list[k].center_x = centery;
					}
				}
			}
		}
		
		for(var j = 0; j < panel_count; j ++)
		{
			panels[index_list[j].id].panel_index = j + parseInt(panel_start_id);
			panels[index_list[j].id].label = (panels[index_list[j].id].panel_index).toString();
		}
	}
	
	if(range <= 0){
		_.each(geo.block.objs,function(b){
			sort_panel(b.panels,b.panel_start_id);
		});
		
	}else{
		var panels = _.union(..._.map(geo.block.objs,o=>o.panels));
		sort_panel(panels,1);
	}
}


function panel_resort(geo){
	var imageEdge;
	var glassEdge;
	var trendX;
	var trendY;
	var dir;
	var range;
	var glasscorner;
	var iCenterMode;
	var sel_cur;
	var x;
	var y;
	var result1;
	var quarant;
	var first_panel_mode;
	var iStartPos;
	

	iCenterMode = geo.glass.iCenterMode;
	imageEdge = geo.glass.iLongEdge; 
	quarant = geo.glass.iStartQuandrant;
	glasscorner = geo.glass.corner;
	quarant -= 1;
	glasscorner -= 1;
	
	if(geo.glass.size[0] > geo.glass.size[1])
	{
		glassEdge = 0;
	}
	else
	{
		glassEdge = 1;
	}
	
	if(imageEdge == glassEdge)
	{
		trendX = geo.glass.sort_trend_x;
		trendY = geo.glass.sort_trend_y;
	}
	else
	{
		trendY = geo.glass.sort_trend_x;
		trendX = geo.glass.sort_trend_y;
	}
	
	dir = geo.glass.sort_direction;
	range = geo.glass.sort_range;
	
	if(glasscorner < 0)
	{
		return;
	}
	
	if(trendX < 0)
	{
		return;
	}
	
	if(trendY < 0)
	{
		return;
	}
	
	if(quarant < 0)
	{
		return;
	}
	else if(quarant == 1)
	{
		quarant = 2;
	}
	else if(quarant == 2)
	{
		quarant = 3;
	}
	else if(quarant == 3)
	{
		quarant = 1;
	}
	
	if(glasscorner == 1)
	{
		glasscorner = 2;
	}
	else if(glasscorner == 2)
	{
		glasscorner = 3;
	}
	else if(glasscorner == 3)
	{
		glasscorner = 1;
	}
	
	result1 = glasscorner^quarant;
	
	x = (-1) * Math.pow(-1.0, Math.floor(result1 / 2)) * Math.pow(-1.0, trendX);
	y = (-1) * Math.pow(-1.0, result1 % 2) * Math.pow(-1.0, trendY);
	
	first_panel_mode = 0;
	
	if(x < 0)
	{
		x = 0;
	}
	
	if(y < 0)
	{
		y = 0;
	}
	
	first_panel_mode = x * 2 + y;

	if(geo.glass.use_hsd)
	{
		iStartPos = geo.glass.sort_start_pos;
		ResortPanelID(geo,first_panel_mode, dir, range,iStartPos);
	}
	else
	{
		ResortPanelIndex(geo,first_panel_mode, dir, range);
	}
	
}

return{
	panel_resort,
}


});
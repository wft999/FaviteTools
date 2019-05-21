odoo.define('padtool.canvas_fields', function (require) {
"use strict";

/**
 * This module contains most of the basic (meaning: non relational) field
 * widgets. Field widgets are supposed to be used in views inheriting from
 * BasicView, so, they can work with the records obtained from a BasicModel.
 */

var AbstractField = require('web.AbstractField');
var field_registry = require('web.field_registry');
var core = require('web.core');
var field_utils = require('web.field_utils');
var QWeb = core.qweb;

const BLOCK_COL_NUM = 32;//水平方向BLOCK数目
const BLOCK_ROW_NUM = 44;//垂直方向BLOCK数目
const BLOCK_WIDTH = 12000;//BLOCK图像宽度
const BLOCK_HEIGHT = 5000;//BLOCK图像
const OVERVIEW_FILE = "/jpgdata/TestTu-NoOffset.bmp";//缩略图文件
const BLOCKS_DIR = "/jpgdata/JpegFile";//BLOCK文件

var CanvasObjects = AbstractField.extend({
	template: 'ShowCanvasObjects',
    className: "o_dashboard_graph",
    cssLibs: [

    ],
    jsLibs: [
 //       '/padtool/static/lib/fabric.js',
    ],
    events: _.extend({
        'focus .canvas': '_showImg',
    }, AbstractField.prototype.events),
    init: function () {
        this._super.apply(this, arguments);
        this.data = JSON.parse(this.value);
        
    },
    
    start: function () {
    	//$(".o_sub_menu").fadeOut();
    	//$(".o_main_content").css("width","100%");
    	var self = this;
        return this._super.apply(this, arguments).then(function(){
        	self._loadImage();
        });
    },
    destroy: function () {
    	//$(".o_sub_menu").fadeIn();
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    _loadImage: function(){
       	var self = this;
        
    	this.rect;
        this.blocks = new Map();
    	this.overViewImage = new fabric.Image();
    	
    	this.overViewImage.setSrc(OVERVIEW_FILE, function(img) {
    		img.set({
    	      left: 0,
    	      top: 0,
    	      hasControls:false,
    	      lockMovementX:true,
    	      lockMovementY:true,
    	      selectable:false 
    		});
    		
    		
    		self.canvas1  = new fabric.Canvas('myCanvas1');
    		self.canvas2  = new fabric.StaticCanvas('myCanvas2');
    		var zoom = Math.max(self.canvas1.getWidth()/img.width,self.canvas1.getHeight()/img.height);
    		self.canvas1.setZoom(zoom);
    		self.canvas1.add(img);
    	    
    		self.rect = new fabric.Rect({
    	    			left:0,
    	    			top:0, 
    	    			width: 2*img.width/BLOCK_COL_NUM, 
    	    			height: 2*img.height/BLOCK_ROW_NUM, 
    	    			opacity: 0.1,
    	    			cornerStyle: "circle",
    	    			cornerSize: 5,
    	    			lockScalingX:true,
    	    			lockScalingY:true,
    	    			hasRotatingPoint:false,
    	    			borderColor:"rgb(255,0,0)"
    	    		});
    		self.rect.on("modified",self._update.bind(self));
    		self.rect.on("deselected",function(){self.canvas1.setActiveObject(self.rect);});
    	    self.canvas1.add(self.rect);
    	    self.canvas1.setActiveObject(self.rect);
    	    
    	    
    	    self.slider1 = document.getElementById("Range1");
    	    self.slider2 = document.getElementById("Range2");
    	    self.slider1.value = zoom;
    	    self.slider1.onchange = function () {
    	    	self.canvas1.setZoom(self.slider1.value);
    	    	self.canvas1.setDimensions({width:img.width*self.slider1.value,height:img.height*self.slider1.value});
    	    };
    	    self.slider2.onchange = function () {
    	    	var zoom = self.canvas2.getZoom();
    	    	var width = self.canvas2.getWidth();
    	    	var height = self.canvas2.getHeight();
    	    	self.canvas2.setZoom(self.slider2.value);	
    	    	self.canvas2.setDimensions({width:self.slider2.value*width/self.canvas2.zoom1,height:self.slider2.value*height/self.canvas2.zoom1});
    	    }
    	    
    	    self._update();
    	});

    },
    _update: function (){  
        var startCol = BLOCK_COL_NUM * this.rect.left/this.overViewImage.width;
        var endCol = BLOCK_COL_NUM * (this.rect.left+this.rect.width*this.rect.scaleX)/this.overViewImage.width;
        var startRow = BLOCK_ROW_NUM * this.rect.top/this.overViewImage.height;
        var endRow = BLOCK_ROW_NUM * (this.rect.top+this.rect.height*this.rect.scaleY)/this.overViewImage.height;
        
        var zoom = Math.max(this.canvas2.getWidth()/(BLOCK_WIDTH*(endCol-startCol)),this.canvas2.getHeight()/(BLOCK_HEIGHT*(endRow-startRow)));
        
      //  console.log("startCol:"+startCol+"  endCol:"+endCol+"  startRow:"+startRow+"  endRow:"+endRow+"  zoom:"+zoom+"\n");

        this.slider2.value = zoom;
        this.canvas2.setZoom(zoom);
        this.canvas2.setDimensions({width:BLOCK_WIDTH*(endCol-startCol)*zoom,height:BLOCK_HEIGHT*(endRow-startRow)*zoom});
        this.canvas2.clear();
        this.canvas2.zoom1 = zoom;
        
        
        var cropX0 = null;
        var cropY0 = null;
        for(var col=Math.floor(startCol);col<Math.ceil(endCol);col++){
            for(var row=Math.floor(startRow);row<Math.ceil(endRow);row++){
            	
        		var left = col>Math.floor(startCol)?(col-Math.floor(startCol)-1)*BLOCK_WIDTH+(BLOCK_WIDTH-cropX0): 0;
                var top = row>Math.floor(startRow)?(row-Math.floor(startRow)-1)*BLOCK_HEIGHT+(BLOCK_HEIGHT-cropY0) : 0;
                var cropX = col>Math.floor(startCol)? 0 : Math.floor((startCol-col)*BLOCK_WIDTH);
                var cropY = row>Math.floor(startRow)? 0 : Math.floor((startRow-row)*BLOCK_HEIGHT);
                var width = col==Math.floor(startCol)? BLOCK_WIDTH-cropX : (col == Math.floor(endCol)?(endCol-col)*BLOCK_WIDTH:BLOCK_WIDTH);
                var height = row==Math.floor(startRow)? BLOCK_HEIGHT-cropY : (row == Math.floor(endRow)?(endRow-row)*BLOCK_HEIGHT:BLOCK_HEIGHT) ;		

                if(cropX0 == null) cropX0 = cropX;
                if(cropY0 == null) cropY0 = cropY;
                
                var opt = {
                		left: left,
                        top: top,
                        cropX: cropX,
                        cropY: cropY,
                        width: Math.floor(width),
                        height: Math.floor(height),
                        originX: 'left',
                        originY: 'top',
                        objectCaching:false,
                }
                
                var img;
                if(this.blocks.has('scan'+col+'_block'+row)){
                	img = blocks.get('scan'+col+'_block'+row);
                	img.set(opt)
                	this.canvas2.add(img);
                }else{
                	img = new fabric.Image();
                	img.opt = opt;
                	var self = this;
                	img.setSrc(BLOCKS_DIR+"/AoiL_IP0_scan0_block"+row+".jpg", function(img) {
                        img.set(img.opt)  
                        self.canvas2.add(img);
                    });
                	this.blocks.set('scan'+col+'_block'+row,img);
                }
                
                   
                console.log("col:"+col+"  row:"+row+"  left:"+left+"  top:"+top+"  cropX:"+cropX+"  cropY:"+cropY+"  width:"+width+"  height:"+height+"\n");
                
            }
        }

    },

    /**
     * @private
     */
    _render: function () {
  /*      var self = this;
        this.$el.html(QWeb.render('ShowCanvasObjects', {

        }));*/

    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onResize: function () {
        if (this.chart) {
            this.chart.update();
            this._customizeChart();
        }
    },
});

field_registry.add('canvas', CanvasObjects);



});

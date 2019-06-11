odoo.define('favite_common.Mixin', function (require) {
"use strict";

var RedoUndo = {
	
	register:function(pad,action) {
    	var pads = [];
    	if(Array.isArray(pad)){
    		pads = pad;
    	}else{
    		pads.push(pad);
    	}
    	
    	var points = [];
    	pads.forEach(function(item){
    		var tmp = [];
    		
    		item.points.forEach(function(p){
    			if(action !== 'copy')
    				tmp.push({x:p.x,y:p.y,ux:p.ux,uy:p.uy});
        	});

    		points.push(tmp);
    	})
    	
        this.undoStack.push({pads,points,action});
        this.redoStack.length = 0;
    },
    
    undo:function() {
        var c = this.undoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		if(c.action == 'delete')
        			points.push([]);
        		else
        			points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
            this.redoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },
    
    redo:function() {
        var c = this.redoStack.pop();
        if (c) {
        	var points = [];
        	for(var i = 0; i< c.pads.length; i++){
        		points.push(c.pads[i].points);
        		
        		c.pads[i].points = c.points[i];
                c.pads[i].update();
        	}
        	
            this.undoStack.push({pads:c.pads,points,action:c.action});
            this.hawkmap && this.hawkmap.showImage();
        }
    },

};

return {
	RedoUndo
};


});
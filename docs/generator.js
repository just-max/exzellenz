function getUrlParameterByName(name) {
	return new URL(window.location.href).searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
            M.Sidenav.init(document.querySelectorAll('.sidenav'));
            M.FormSelect.init(document.querySelectorAll('select'));
            
            var textInputBox = document.getElementById('output-text');
            var outputTypeSelect = document.getElementById('output-format');
            
            var defaultText = getUrlParameterByName('text');
            if (defaultText) {
            	textInputBox.value = defaultText;
            	M.updateTextFields();
            }
            
            var canvas = SVG().addTo("#output-container").size('100%', '100%');
            
            // uncomment this line to visualize the canvas
            //canvas.rect('100%', '100%').fill("#0000007f");
            
            var DEFAULT_SIZE = 100;
            var M_MULT = 811/1024;
            
            var outputTextElement = canvas.plain("");
            outputTextElement.fill("#1565c0");
            outputTextElement.font({
  				family:   'exzellenz',
  				size:     DEFAULT_SIZE
			});
            
            var defaultTransform = outputTextElement.transform();
            
            function validateInputs() {
            	return textInputBox.checkValidity() && outputTypeSelect.checkValidity();
            }
            
            // allows getting the size of the actual canvas, NOT the size occupied by drawn elements
            function getCanvasBBox() {
            	// draw an invisible rectangle over the whole canvas
            	var r = canvas.rect('100%', '100%').fill("#00000000");
            	// get its bounding box
            	var b = r.bbox();
            	// remove the invisible rectangle
            	r.remove();
            	
            	return b;
            }
            
            var drawText = function() {
            	outputTextElement.transform(defaultTransform);
            	
            	var outputText = validateInputs() ? textInputBox.value : 'NO TEXT';
            	outputTextElement.text(outputText);
            	
            	var canvasBBox = getCanvasBBox();
            	var textBBox = outputTextElement.bbox();
            	
            	var sf = canvasBBox.width / textBBox.width;
            	
            	outputTextElement.scale(sf, 0, 0);
            	outputTextElement.move(0, 0);
            	
            	canvas.height(Math.ceil(M_MULT * sf * outputTextElement.bbox().height));
            }
            
            drawText();
            textInputBox.addEventListener('input', drawText);
            window.addEventListener('resize', drawText);
        });

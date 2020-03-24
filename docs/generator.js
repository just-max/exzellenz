function getUrlParameterByName(name) {
	return new URL(window.location.href).searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
    
    // initialize the materialize.css plugins
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.FormSelect.init(document.querySelectorAll('select'));
    
    
    // object for all the form options
//    var options = {text: "",
//                   format: "",
//                   height: 100,
//                   padding: 20}
    
    // query the form elements
    var optionTextInputField = document.getElementById('output-text');
    var optionFormatSelect = document.getElementById('output-format');
    var optionHeightInputField = document.getElementById('output-text-height');
    var optionPaddingInputField = document.getElementById('output-padding');
    var optionTransparentBackgroundCheckbox = document.getElementById('output-background-transparent');
    
    var downloadButton = document.getElementById('download-button');
    
    // load and set the text from the url paramater
    var defaultText = getUrlParameterByName('text');
    if (defaultText) {
        optionTextInputField.value = defaultText;
        M.updateTextFields();
    }
    
    
    // create the preview SVG canvas and add it to the container element
    var previewCanvas = SVG().addTo("#output-preview-container").size('100%', '100%');
    
    var downloadContainer = document.getElementById("output-download-container");
    // create the (hidden) final output SVG canvas and add it to its container
    var downloadCanvas = SVG().addTo(downloadContainer).size('100%', '100%');
    var downloadBackground = downloadCanvas.rect('100%', '100%').fill('#ffffff');

    // uncomment these lines to visualize the canvases
    // previewCanvas.rect('100%', '100%').fill("#0000007f");
    // downloadCanvas.rect('100%', '100%').fill("#0000007f");
    
    
    var DEFAULT_SIZE = 100;
    // the height of a character relative to the full line
    var M_MULT = 811/1024; // maybe 801 is better?
    
    var outputTextColor = "#1565c0";
    var outputTextFont = {
        family:   'exzellenz',
        size:     DEFAULT_SIZE
    };

    var previewTextElement = previewCanvas.plain("");
    previewTextElement.fill(outputTextColor);
    previewTextElement.font(outputTextFont);

    var defaultTransform = previewTextElement.transform();
    
    var downloadTextElement = downloadCanvas.plain("");
    downloadTextElement.fill(outputTextColor);
    downloadTextElement.font(outputTextFont);

    function inputsAreValid() {
        return optionTextInputField.checkValidity() &&
               optionFormatSelect.checkValidity() &&
               optionHeightInputField.checkValidity() &&
               optionPaddingInputField.checkValidity();
    }

    // allows getting the size of the actual canvas, NOT the size occupied by drawn elements
    function getCanvasBBox(canvas) {
        // draw an invisible rectangle over the whole canvas
        var r = canvas.rect('100%', '100%').fill("#00000000");
        // get its bounding box
        var b = r.bbox();
        // remove the invisible rectangle
        r.remove();

        return b;
    }
    
    var drawPreviewText = function() {
        // reset the text transform
        previewTextElement.transform(defaultTransform);
        
        // load and set the text to output
        var outputText;
        if (inputsAreValid()) outputText = optionTextInputField.value;
        else if (optionTextInputField.value) outputText = "invalid input";
        else outputText = "no text";
        previewTextElement.text(outputText);
        
        // get the current bounding box of the text
        var canvasBBox = getCanvasBBox(previewCanvas);
        var textBBox = previewTextElement.bbox();
        
        // calculate how much bigger (or smaller) the text needs to be to fill
        var scaleFactor = canvasBBox.width / textBBox.width;
        
        // scale the text appropriately
        previewTextElement.scale(scaleFactor, 0, 0);
        previewTextElement.move(0, 0);
        
        // shrink the canvas down to fit the text
        previewCanvas.height(Math.ceil(M_MULT * scaleFactor * previewTextElement.bbox().height));
    }
    
    var drawDownloadText = function() {
        if (!inputsAreValid()) return;
        
        // draw the background if selected
        if (optionTransparentBackgroundCheckbox.checked) {
            downloadBackground.remove();
        }
        else {
            downloadBackground.insertBefore(downloadTextElement);
        }
        
        // load height and padding
        var textHeight = parseInt(optionHeightInputField.value);
        var textPadding = parseInt(optionPaddingInputField.value);
        
        // set the text
        downloadTextElement.text(optionTextInputField.value);
        
        // reset the transformation
        downloadTextElement.transform(defaultTransform);
        downloadTextElement.move(0, 0);
        
        // scale the text to the desired height
        var textBBox = downloadTextElement.bbox();
        var scaleFactor = textHeight / (textBBox.height * M_MULT);
        downloadTextElement.move(textPadding / scaleFactor, textPadding / scaleFactor);
        downloadTextElement.scale(scaleFactor, 0, 0);

        // move to create padding
        // resize the canvas accounting for padding
        downloadCanvas.size(scaleFactor * textBBox.width + 2 * textPadding, textHeight + 2 * textPadding);
    }

    var onFormUpdate = function() {
        drawPreviewText();
        
        if (inputsAreValid()) {
            downloadButton.classList.remove('disabled');
            downloadButton.parentElement.title = "";
        }
        else {
            downloadButton.classList.add('disabled')
            downloadButton.parentElement.title = "Invalid Text or Option(s)";
        }
    }
    
    var doDownload = function() {
        if (inputsAreValid()) {
            
            // make the canvas visible for correct drawing
            downloadContainer.removeAttribute('hidden');
            drawDownloadText();
            
            var element = document.createElement('a');
            element.setAttribute('href', 'data:image/svg+xml;base64,' + btoa(downloadContainer.innerHTML));
            element.setAttribute('download', optionTextInputField.value.replace(/ +/g, '_').toLowerCase());

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
            
            // hide the extra canvas again
            downloadContainer.setAttribute('hidden', '""');
        }
    }
    
    // redraw the text upon changing the input or resizing the window
    optionTextInputField.addEventListener('input', onFormUpdate);
    optionHeightInputField.addEventListener('input', onFormUpdate);
    optionPaddingInputField.addEventListener('input', onFormUpdate);
    optionTransparentBackgroundCheckbox.addEventListener('change', onFormUpdate);
    window.addEventListener('resize', onFormUpdate);
    
    downloadButton.addEventListener('click', doDownload);
    downloadButton.addEventListener('keydown', doDownload);
    
    // workaround for (first) text not lining up properly
    window.setTimeout(onFormUpdate, 200);
});

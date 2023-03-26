function getUrlParameterByName(name) {
    return new URL(window.location.href).searchParams.get(name);
}

// allows getting the size of the actual canvas, NOT the size occupied by drawn elements
// the SVG canvas must have the xmlns attribute set, such as xmlns="http://www.w3.org/2000/svg"
function getSvgTrueBBox(svgEl) {
    xmlns = svgEl.namespaceURI;
    bgRect = document.createElementNS(xmlns, 'rect');
    
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'black');

    // add the background box, grab its bounding box, then remove it again
    svgEl.appendChild(bgRect);
    bbox = bgRect.getBBox();
    bgRect.remove();

    return bbox;
}

// the font size used to measure the rendered bounding box
// higher values seem to increase accuracy but with quickly diminishing returns
const MEASUREMENT_FONT_SIZE = 1024;

const XMLNS = 'http://www.w3.org/2000/svg';


class TextPreview {
    constructor(parent, xmlns = XMLNS, viewBoxWidth = 100) {
        var canvas = document.createElementNS(xmlns, 'svg');
        canvas.setAttribute('viewBox', '0 0 ' + viewBoxWidth + ' 1');
        canvas.setAttribute('class', 'text-preview-canvas');
        
        var textElement = document.createElementNS(xmlns, 'text');
        textElement.setAttribute('class', 'text-preview-text');
        
        canvas.appendChild(textElement);
        parent.appendChild(canvas);
        
        this.textElement = textElement;
        this.canvas = canvas;
        
        this.viewBoxWidth = viewBoxWidth;
        
        // reflow the text when the full page, including font faces, loads
        // (this is NOT DOMContentLoaded, see https://stackoverflow.com/a/36096571)
        // or when the window gets resized (no other element can receive resize events, unfortunately)
        for (const event of ['load', 'resize']) {
            window.addEventListener(event, TextPreview.prototype.reflowText.bind(this));
        }
    }
    
    updateText(newText) {
        this.textElement.textContent = newText;
        this.reflowText();
    }
    
    reflowText() {
        // reset all the attributes
        this.textElement.setAttribute('y', '0');
        this.textElement.setAttribute('font-size', MEASUREMENT_FONT_SIZE + 'px');
        
        // get the width of the text and the canvas, their ratio is the scale factor for the font size
        var canvasWidth = getSvgTrueBBox(this.canvas).width;
        var measuredWidth = this.textElement.getBBox().width;
        
        // scale the font size by the ratio canvasWidth:measuredWidth
        this.textElement.setAttribute('font-size', (canvasWidth * MEASUREMENT_FONT_SIZE / measuredWidth) + 'px');
        
        // get the new bounding box for the resized text
        var scaledTextBBox = this.textElement.getBBox();
        
        // move the text down by how much it currently protrudes off the top of the canvas
        this.textElement.setAttribute('y', - scaledTextBBox.y);
        
        // resize the viewBox to only contain the text
        this.canvas.setAttribute('viewBox', '0 0 ' + this.viewBoxWidth + ' ' + (- scaledTextBBox.y));
    }
}


class ListenableForm {
    constructor(elements) {
        this.elements = elements;
        this.elementsById = {};

        for (const el of elements) {
            el.domElement = document.getElementById(el.id);
            this.elementsById[el.id] = el.domElement;
            
            var callback = ListenableForm.prototype.receiveCallback
                                .bind(this, el.submit ? 'submit' : 'update', el);
            
            el.addListenerCb(el.domElement, callback);
        }

        this.listenerCallbacks = { 'update': [], 'submit': [] };
    }
    
    addListener(eventType, cb) {
        if (eventType in this.listenerCallbacks) {
            this.listenerCallbacks[eventType].push(cb);
        }
    }
    
    receiveCallback(eventType, element) {
        for (const cb of this.listenerCallbacks[eventType]) {
            cb.apply(null, [this].concat(Array.prototype.slice.call(arguments)));
        }
    }
    
    triggerEvent(eventType) {
        if (eventType in this.listenerCallbacks) {
            this.receiveCallback(eventType, null);
        }
    }
    
    // checks if all the form's inputs are valid
    allInputsValid() {
        for (const el of this.elements) {
            // only validate elements that are not submit elements, unless they explicitly set validate
            if ((el.validate === undefined && !el.submit) || el.validate) {            
                if (!el.domElement.checkValidity()) {
                    return false;
                }
            }
        }
        return true;
    }
}


// if fontData is present, embed it in the font, otherwise use fontFamily
function createSVGDataURL(text, fontSize, padding, backgroundColor,
        fontFamily, fontData, textColor = '#000', xmlns = XMLNS) {
    var svgElement = document.createElementNS(xmlns, 'svg');
    svgElement.setAttribute('xmlns', xmlns);
    // workaround for bug in chrome: set "approximate" view box size: https://github.com/just-max/exzellenz/issues/5
    svgElement.setAttribute('viewBox', `0 0 ${fontSize * text.length * 0.5} ${fontSize}`);
    
    var textElement = document.createElementNS(xmlns, 'text');
    textElement.setAttribute('word-spacing', '0px');
    
    if (fontData) {
        styleElement = document.createElementNS(xmlns, 'style');
        styleElement.textContent = '@font-face { font-family: "' +
            fontFamily + '"; src: url("' + fontData + '"); }';
        svgElement.appendChild(styleElement);
    }

    if (backgroundColor) {
        bgElement = document.createElementNS(xmlns, 'rect');
        bgElement.setAttribute('width', '100%');
        bgElement.setAttribute('height', '100%');
        bgElement.setAttribute('fill', backgroundColor);
        svgElement.appendChild(bgElement);
    }
    
    svgElement.appendChild(textElement);
    
    textElement.textContent = text;
    textElement.setAttribute('font-size', fontSize + 'px');
    textElement.setAttribute('font-family', fontFamily);
    textElement.setAttribute('fill', textColor);
    
    document.body.appendChild(svgElement);
    
    var textBBox = textElement.getBBox();
    var textAscent = - textBBox.y;
    var width = textBBox.width + 2 * padding;
    var height = textAscent + 2 * padding;
    
    textElement.setAttribute('x', padding);
    textElement.setAttribute('y', padding + textAscent);
    
    svgElement.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    
    svgElement.setAttribute('height', height + 'px');
    svgElement.setAttribute('width', width + 'px');
    
    var dataURL = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(svgElement.outerHTML);
    
    svgElement.remove();
    
    return {url: dataURL, width: width, height: height};
}

function createPNGDataURL(dataURL, width, height) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('width', width + 'px');
    canvas.setAttribute('height', height + 'px');
    var canvasCtx = canvas.getContext('2d');
    
    var img = new Image();
    var dataURL = dataURL;
    
    return new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = dataURL;
        })
        .then(loadedImg => { 
            document.body.appendChild(canvas);
            canvasCtx.drawImage(loadedImg, 0, 0);
            pngDataURL = canvas.toDataURL('image/png');
            canvas.remove();
            return pngDataURL;
        });
}


// returns a function that receives an element and a callback and adds that callback
// as a standard event listener using the given event
function addStandardEventListener(eventName) {
    return function(obj, cb) {
        obj.addEventListener(eventName, cb);
    }
}

function doDownloadDataURL(dataURL, fileName) {
    var element = document.createElement('a');
    element.setAttribute('href', dataURL);
    element.setAttribute('download', fileName);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    element.remove();
}

const addInputListener = addStandardEventListener('input');
const addChangeListener = addStandardEventListener('change');
const addClickListener = addStandardEventListener('click');
const addKeydownListener = addStandardEventListener('keydown');
const addClickKeydownListener = function(obj, cb) { addClickListener(obj, cb); addKeydownListener(obj, cb); }

const formElements = [
    {id: 'output-text',                     addListenerCb: addInputListener},
    {id: 'output-format',                   addListenerCb: addInputListener},
    {id: 'output-text-height',              addListenerCb: addInputListener},
    {id: 'output-padding',                  addListenerCb: addInputListener},
    {id: 'output-background-transparent',   addListenerCb: addChangeListener},
    {id: 'download-button',                 addListenerCb: addClickKeydownListener, submit: true}];


function updateValidation(isValid, downloadButton) {
    if (isValid) {
        downloadButton.classList.remove('disabled');
        downloadButton.parentElement.title = '';
    }
    else {
        downloadButton.classList.add('disabled');
        downloadButton.parentElement.title = 'Invalid Text or Option(s)';
    }
}

function updatePreviewText(isValid, textElement, textPreview) {
    if (isValid) {
        textPreview.updateText(textElement.value);
    }
    else if (!textElement.value) {
        textPreview.updateText('empty');
    }
    else {
        textPreview.updateText('invalid');
    }
}

// get the callback to connect to the form's update event
function getUpdateFormCallback(textElementId, downloadButtonId, textPreview) {
    return function(form) {
        var isValid = form.allInputsValid();
        updateValidation(isValid, form.elementsById[downloadButtonId]);
        updatePreviewText(isValid, form.elementsById[textElementId], textPreview);
    }
}

function getDownloadCallback(textElementId, formatElementId, heightElementId,
        paddingElementId, transparentCheckboxElementId) {
    return function(form) {
        fontLoadedPromise.then(fontDataURL => {
            svgDataURL = createSVGDataURL(
                    form.elementsById[textElementId].value,
                    parseInt(form.elementsById[heightElementId].value),
                    parseInt(form.elementsById[paddingElementId].value),
                    form.elementsById[transparentCheckboxElementId].checked ? null : '#FFF', // background color
                    'exzellenz',
                    fontDataURL,
                    '#1565c0' // text color
                );
            
            fileNameBase = form.elementsById[textElementId].value.replace(/ +/g, '_').toLowerCase();
            
            if (form.elementsById[formatElementId].value == 'output-format-svg') {
                doDownloadDataURL(svgDataURL.url, fileNameBase + '.svg');
            }
            else if (form.elementsById[formatElementId].value == 'output-format-png') {
                return createPNGDataURL(svgDataURL.url, svgDataURL.width, svgDataURL.height)
                        .then(pngDataURL => doDownloadDataURL(pngDataURL, fileNameBase + '.png'));
            }
        },
        () => {
            // TODO HANDLE ERROR in font loading
            console.log('error loading embedded font');
        });
    }
}

// fetches the resource at the given url and returns a promise that resolve to the resource's data URL
function fetchAsDataURL(url) {
    return fetch(url)
        .then(response => {
            // if the request was successful, return a new Promise for the Blob
            if (response.ok) return response.blob();
            else return Promise.reject(new Error(response.status + ' ' + response.statusText));
        })
        .then(blob => new Promise((resolve, reject) => {
                var reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }));
}


// this gets set by a promise
var exzellenzFontDataURL;
const fontLoadedPromise = fetchAsDataURL('/fonts/exzellenz/exzellenz.woff')
    .then(dataURL => { exzellenzFontDataURL = dataURL; return dataURL; });

document.addEventListener('DOMContentLoaded', function() {
    
    // initialize the materialize.css plugins
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.FormSelect.init(document.querySelectorAll('select'));
    
    var mainTextPreview = new TextPreview(document.getElementById('output-preview-container'));
    
    var optionForm = new ListenableForm(formElements);
    optionForm.addListener('update', getUpdateFormCallback('output-text', 'download-button', mainTextPreview));
    optionForm.addListener('submit', getDownloadCallback('output-text', 'output-format', 'output-text-height',
        'output-padding', 'output-background-transparent'));
    
    // TODO parse url parameters
    var defaultText = getUrlParameterByName('text');
    if (defaultText) {
        optionForm.elementsById['output-text'].value = defaultText;
        M.updateTextFields();
    }
    
    optionForm.triggerEvent('update');
});

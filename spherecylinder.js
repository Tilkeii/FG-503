// This program was developped by Daniel Audet and uses sections of code  
// from http://math.hws.edu/eck/cs424/notes2013/19_GLSL.html
//
//  It has been adapted to be compatible with the "MV.js" library developped
//  for the book "Interactive Computer Graphics" by Edward Angel and Dave Shreiner.
//

"use strict";

var gl;   // The webgl context.

var CoordsLoc;       // Location of the coords attribute variable in the standard texture mappping shader program.
var NormalLoc;
var TexCoordLoc;

var ProjectionLoc;     // Location of the uniform variables in the standard texture mappping shader program.
var ModelviewLoc;
var NormalMatrixLoc;
var initialmodelview;

var aCoordsbox;     // Location of the coords attribute variable in the shader program used for texturing the environment box.
var aNormalbox;
var aTexCoordbox;

var uModelviewbox;
var uProjectionbox;
var uEnvbox;

// Id des differents composants
var carlingueId = 0;
var preAileDroitId = 1;
var aileDroitId = 2;
var reacteurDroitId = 3;
var preAileGaucheId = 4;
var aileGaucheId = 5;
var reacteurGaucheId = 6;
var avantVaisseauId = 7;
var cockpitId = 8;

var numNodes = 9;

var projection;   //--- projection matrix
var modelview;    // modelview matrix
var flattenedmodelview;    //--- flattened modelview matrix

var normalMatrix = mat3();  //--- create a 3X3 matrix that will affect normals

var rotator;   // A SimpleRotator object to enable rotation by mouse dragging.

var cube1, trapeze1, trapeze2, trapeze3, cylindre, triangle, cylindreNoBottom, cylinderQuart;

var prog, progbox;  // shader program identifier

var lightPosition = vec4(50.0, 20.0, 100.0, 1.0);

var lightAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(0.0, 0.1, 0.3, 1.0);
var materialDiffuse = vec4(0.48, 0.55, 0.69, 1.0);
var materialSpecular = vec4(0.8, 0.8, 0.8, 1.0);
var materialShininess = 100.0;

var texIDmap0;  // environmental texture identifier
var envbox;  // model identifiers

var ct = 0;
var img = new Array(6);

var phong = 1; var activateTex = 0;

var figure = [];

var ambientProduct, diffuseProduct, specularProduct;

var ntextures_loaded = 0;
var ntextures_tobeloaded = 0;

var texture;
var mainTexture, glass, spark, blackTexture, blackTexture2;

function callTexture(name) {
    gl.activeTexture(gl.TEXTURE0); //gl.TEXTURE0
    gl.bindTexture(gl.TEXTURE_2D, name);
    // Send texture to sampler
    gl.uniform1i(texture, 0);
}

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    ntextures_loaded++;

    render();  // Call render function when the image has been loaded (to insure the model is displayed)

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function handleLoadedTextureMap(texture) {

    ct++;
    if (ct == 6) {
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        var targets = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];
        for (var j = 0; j < 6; j++) {
            gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img[j]);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    }
    ntextures_loaded++;
    render();  // Call render function when the image has been loaded (to insure the model is displayed)
}

function createModelbox(modelData) {  // For creating the environment box.
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    console.log(modelData.vertexPositions.length);
    console.log(modelData.indices.length);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
    model.render = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(aCoordsbox, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(uModelviewbox, false, flatten(modelview));
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
    return model;
}

function initTexture() {

    var urls = [
        "images/nebula_posx.png", "images/nebula_negx.png",
        "images/nebula_posy.png", "images/nebula_negy.png",
        "images/nebula_posz.png", "images/nebula_negz.png"
    ];
    texIDmap0 = gl.createTexture();
    //texIDmap0.isloaded = false;

    for (var i = 0; i < 6; i++) {
        img[i] = new Image();
        img[i].onload = function () {  // this function is called when the image download is complete
            handleLoadedTextureMap(texIDmap0);
        };
        img[i].src = urls[i];   // this line starts the image downloading thread
        ntextures_tobeloaded++;
    }

    // define first texture
    mainTexture = gl.createTexture();

    mainTexture.image = new Image();
    mainTexture.image.onload = function () {
        handleLoadedTexture(mainTexture);
    };

    mainTexture.image.src = "texture.jpg";
    ntextures_tobeloaded++;

    // define second texture
    glass = gl.createTexture();

    glass.image = new Image();
    glass.image.onload = function () {
        handleLoadedTexture(glass);
    };

    glass.image.src = "glass.jpg";
    ntextures_tobeloaded++;

    // define third texture
    spark = gl.createTexture();

    spark.image = new Image();
    spark.image.onload = function () {
        handleLoadedTexture(spark);
    };

    spark.image.src = "texture1.jpg";
    ntextures_tobeloaded++;

    // define fourth texture
    blackTexture = gl.createTexture();

    blackTexture.image = new Image();
    blackTexture.image.onload = function () {
        handleLoadedTexture(blackTexture);
    };

    blackTexture.image.src = "blackTexture.jpg";
    ntextures_tobeloaded++;

    // define fifth texture
    blackTexture2 = gl.createTexture();

    blackTexture2.image = new Image();
    blackTexture2.image.onload = function () {
        handleLoadedTexture(blackTexture2);
    };

    blackTexture2.image.src = "blackTexture2.jpg";
    ntextures_tobeloaded++;
}


// Function pour la creation d'un noeud

function createNode(transform, render, sibling, child) {
    var node = {
        transform: transform,
        render: render,
        sibling: sibling,
        child: child
    };
    return node;
}

// Fonction pour mettre de la couleur

function setColor(a, b, c, d, e ,f , g ,h, i)
{
    ambientProduct = mult(lightAmbient, vec4(a,b,c,1));
    diffuseProduct = mult(lightDiffuse, vec4(d,e,f,1));
    specularProduct = mult(lightSpecular, vec4(g,h,i,1));
    gl.uniform4fv(gl.getUniformLocation(prog, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(prog, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(prog, "specularProduct"), flatten(specularProduct));
}

// Fonction pour restaurer la couleur à la couleur de base utilisé pour le vaisseau

function resetColor() {
    setColor(1,1,1,0.8,0.8,0.8,0.8,0.8,0.8);
}

function resetTexture() {
    callTexture(mainTexture);
}

function changeActivateTex() {
    if (activateTex) {
        activateTex = 0;
        gl.uniform1i(gl.getUniformLocation(prog, "activateTex"), activateTex);
    }
    else {
        activateTex = 1;
        gl.uniform1i(gl.getUniformLocation(prog, "activateTex"), activateTex);
    }

    return activateTex;
}

function changePhong() {
    if (phong) {
        phong = 0;
        gl.uniform1i(gl.getUniformLocation(prog, "phong"), phong);
    }
    else {
        phong = 1;
        gl.uniform1i(gl.getUniformLocation(prog, "phong"), phong);
    }

    return phong;
}

// Initialise les noeauds de notre arbre

function initNodes(Id) {

    var m = mat4(1, 0, 0, 0,
                 0, 1, 0, 0,
                 0, 0, 1, 0,
                 0, 0, 0, 1);

    switch (Id) {

        case carlingueId:
            m = rotate(70, 0, 1, 0);
            m = mult(m, rotate(45, 1, 0, 0));
            m = mult(m, rotate(10, 0, 0, 1));
            figure[carlingueId] = createNode(m, carlingue, null, preAileDroitId);
            break;

        case preAileDroitId:
            figure[preAileDroitId] = createNode(m, preAileDroit, preAileGaucheId, aileDroitId);
            break;

        case preAileGaucheId:
            figure[preAileGaucheId] = createNode(m, preAileGauche, avantVaisseauId, aileGaucheId);
            break;

        case avantVaisseauId:
            figure[avantVaisseauId] = createNode(m, avantVaisseau, cockpitId, null);
            break;

        case cockpitId:
            figure[cockpitId] = createNode(m, cockpit, null, null);
            break;

        case aileDroitId:
            figure[aileDroitId] = createNode(m, aileDroit, null, reacteurDroitId);
            break;

        case aileGaucheId:
            figure[aileGaucheId] = createNode(m, aileGauche, null, reacteurGaucheId);
            break;

        case reacteurDroitId:
            figure[reacteurDroitId] = createNode(m, reacteurDroit, null, null);
            break;

        case reacteurGaucheId:
            figure[reacteurGaucheId] = createNode(m, reacteurGauche, null, null);
            break;

    }
}

// Fonction permettant la construction de la Carlingue et de son moteur arriere

function carlingue() {
    resetColor();
    resetTexture();
    modelview = initialmodelview;
    //modelview = mult(modelview, translate(0.0, 0.0, 0.0));
    modelview = mult(modelview, rotate(270, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(2.5, 0.5, 0.5));
    cube1.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(13, 0, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(2, 2, 0.3));
    cylindreNoBottom.render();

    changePhong(); // Desactive phong
    setColor(0.1,0.1,0.1,0,0,0,0,0,0);
    callTexture(blackTexture);
    for (var i = 0; i < 15; i++) {
        modelview = initialmodelview;
        modelview = mult(modelview, translate(14.0, 0, 0.0));
        modelview = mult(modelview, rotate(i*15, 1, 0, 0));
        normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
        modelview = mult(modelview, scale(0.1, 0.39, 0.02));
        cube1.render();
    }
    resetColor();
    changePhong(); // Reactive phong
    resetTexture();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(13.5, 3.3, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.5, 0.25, 0.2));
    triangle.render();
}

// Fonction permettant la construction du composant entre l'aile et la carlingue

function preAileDroit() {
    modelview = initialmodelview;
    modelview = mult(modelview, translate(1.5, -1.2, 4.5));
    modelview = mult(modelview, rotate(270, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(2.7, 0.2, 1));
    trapeze1.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(16, -1.2, 4));
    modelview = mult(modelview, rotate(180, 1, 0, 0));
    modelview = mult(modelview, rotate(90, 0, 0, 1));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.25, 0.1, 1.2));
    trapeze2.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(13, 1, 2.45));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.28, 0.25, 0.01));
    cube1.render();

    setColor(0.4,0.4,0.4,0.4,0.4,0.4,0.1,0.1,0.1);
    callTexture(blackTexture);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(5, -3.5, 4));
    modelview = mult(modelview, rotate(270, 0, 1, 0));
    modelview = mult(modelview, rotate(25, 0, 0, 1));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1, 1, 1));
    cylinderQuart.render();
    resetColor();
    resetTexture();
}

function preAileGauche() {
    modelview = initialmodelview;
    modelview = mult(modelview, translate(1.5, -1.2, -4.5));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(2.7, 0.2, 1));
    trapeze1.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(16, -1.2, -4));
    modelview = mult(modelview, rotate(180, 1, 0, 0));
    modelview = mult(modelview, rotate(90, 0, 0, 1));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.25, 0.1, 1.2));
    trapeze2.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(13, 1, -2.45));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.28, 0.25, 0.01));
    cube1.render();

    setColor(0.4,0.4,0.4,0.4,0.4,0.4,0.1,0.1,0.1);
    callTexture(blackTexture);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(5, -3.5, -4));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    modelview = mult(modelview, rotate(25, 0, 0, 1));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1, 1, 1));
    cylinderQuart.render();
    resetColor();
    resetTexture();
}

// Fonction permettant la construction de l'avant du vaisseau

function avantVaisseau() {

    modelview = initialmodelview;
    modelview = mult(modelview, translate(-25.5, 0.0, 0));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    modelview = mult(modelview, rotate(270, 0, 0, 1));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.5, 1.3, 2.0));
    trapeze3.render();
}

// Fonction permettant la construction du Cockpit et de l'antenne au dessus

function cockpit() {

    changePhong();
    setColor(1,0.1,0.1,1,0.1,0.1,1,0.1,0.1);
    callTexture(glass);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(-6, 4, 0));
    modelview = mult(modelview, rotate(270, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.5, 0.3, 1.2));
    triangle.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(3, 4, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    modelview = mult(modelview, rotate(0, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.5, 0.3, 0.6));
    triangle.render();

    resetColor();
    changePhong();
    resetTexture();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(7, 3, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.501, 0.3, 1.1));
    cube1.render();

    callTexture(blackTexture2);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(7, 5, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.1, 0.2, 0.6));
    cube1.render();
    resetTexture();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(7, 6, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.5, 0.5, 0.8));
    cylindre.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(0, 6, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.3, 0.3, 0.7));
    cylindre.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(-7, 6, 0));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.2, 0.2, 0.7));
    cylindre.render();
    //resetColor();
    //resetTexture();
}

// Construction de l'aile Droit et de l'antenne sur celle ci

function aileDroit() {
    modelview = initialmodelview;
    modelview = mult(modelview, translate(4, -2, 13));
    modelview = mult(modelview, rotate(270, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1.2, 0.8, 0.2));
    trapeze1.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(6.25, -2, 21));
    modelview = mult(modelview, rotate(270, 1, 0, 0));
    modelview = mult(modelview, rotate(180, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.75, 0.4, 0.2));
    trapeze2.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(0, -2, 18));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.3, 0.3, 0.6));
    cylindre.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(-6, -2, 18));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.2, 0.2, 0.6));
    cylindre.render();

    setColor(1,0,0,0,0,0,1,0.1,0.1);
    callTexture(spark);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(4.5, -1.7, 15));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.2, 0.55, 0.01));
    trapeze1.render();
    resetColor();
    resetTexture();

}

function aileGauche() {

    modelview = initialmodelview;
    modelview = mult(modelview, translate(4, -2, -13));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1.2, 0.8, 0.2));
    trapeze1.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(6.25, -2, -21));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    modelview = mult(modelview, rotate(180, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.75, 0.4, 0.2));
    trapeze2.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(0, -2, -18));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.3, 0.3, 0.6));
    cylindre.render();

    modelview = initialmodelview;
    modelview = mult(modelview, translate(-6, -2, -18));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.2, 0.2, 0.6));
    cylindre.render();

    setColor(1,0,0,0,0,0,1,0.1,0.1);
    callTexture(spark);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(4.5, -1.7, -15));
    modelview = mult(modelview, rotate(90, 0, 1, 0));
    modelview = mult(modelview, rotate(90, 1, 0, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(0.2, 0.55, 0.01));
    trapeze1.render();
    resetColor();
    resetTexture();
}

// Construction du reacteur droit

function reacteurDroit() {
    setColor(0.7,0.7,0.7,0.8,0.8,0.8,0.8,0.8,0.8);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(5, -3.5, 15));
    modelview = mult(modelview, rotate(270, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1.2, 1.2, 1.5));
    cylindreNoBottom.render();
    resetColor();

    changePhong();
    setColor(0.1,0.1,0.1,0,0,0,0,0,0);
    callTexture(blackTexture);
    for (var i = 0; i < 10; i++) {
        modelview = initialmodelview;
        modelview = mult(modelview, translate(-1.5, -3.5, 15.0));
        modelview = mult(modelview, rotate(i*20, 1, 0, 0));
        normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
        modelview = mult(modelview, scale(0.1, 0.2, 0.01));
        cube1.render();
    }
    resetColor();
    changePhong();
    resetTexture();
}

function reacteurGauche() {
    setColor(0.7,0.7,0.7,0.8,0.8,0.8,0.8,0.8,0.8);
    modelview = initialmodelview;
    modelview = mult(modelview, translate(5, -3.5, -15));
    modelview = mult(modelview, rotate(270, 0, 1, 0));
    normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
    modelview = mult(modelview, scale(1.2, 1.2, 1.5));
    cylindreNoBottom.render();
    resetColor();

    changePhong();
    setColor(0.1,0.1,0.1,0,0,0,0,0,0);
    callTexture(blackTexture);
    for (var i = 0; i < 10; i++) {
        modelview = initialmodelview;
        modelview = mult(modelview, translate(-1.5, -3.5, -15.0));
        modelview = mult(modelview, rotate(i*20, 1, 0, 0));
        normalMatrix = extractNormalMatrix(modelview);  // always extract the normal matrix before scaling
        modelview = mult(modelview, scale(0.1, 0.2, 0.01));
        cube1.render();
    }
    resetColor();
    changePhong();
    resetTexture();
}

function traverse(Id) {

    if (Id == null) return;
    initialmodelview = mult(initialmodelview, figure[Id].transform);
    figure[Id].render();
    if (figure[Id].child != null) traverse(figure[Id].child);
    if (figure[Id].sibling != null) traverse(figure[Id].sibling);
}

function render() {
    gl.clearColor(0.79, 0.76, 0.27, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projection = perspective(70.0, 1.0, 1.0, 2000.0);

    //--- Get the rotation matrix obtained by the displacement of the mouse
    //---  (note: the matrix obtained is already "flattened" by the function getViewMatrix)
    flattenedmodelview = rotator.getViewMatrix();
    modelview = unflatten(flattenedmodelview);

    normalMatrix = extractNormalMatrix(modelview);

    if(ntextures_loaded == ntextures_tobeloaded){
        initialmodelview = modelview;

        // Draw the environment (box)
        gl.useProgram(progbox); // Select the shader program that is used for the environment box.

        gl.uniformMatrix4fv(uProjectionbox, false, flatten(projection));

        gl.enableVertexAttribArray(aCoordsbox);
        gl.disableVertexAttribArray(aNormalbox);     // normals are not used for the box
        gl.disableVertexAttribArray(aTexCoordbox);  // texture coordinates not used for the box

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texIDmap0);
        // Send texture to sampler
        gl.uniform1i(uEnvbox, 0);

        envbox.render();

        //  Select shader program
        gl.useProgram(prog);

        gl.uniform4fv(gl.getUniformLocation(prog, "ambientProduct"), flatten(ambientProduct));
        gl.uniform4fv(gl.getUniformLocation(prog, "diffuseProduct"), flatten(diffuseProduct));
        gl.uniform4fv(gl.getUniformLocation(prog, "specularProduct"), flatten(specularProduct));
        gl.uniform1f(gl.getUniformLocation(prog, "shininess"), materialShininess);

        gl.uniform4fv(gl.getUniformLocation(prog, "lightPosition"), flatten(lightPosition));

        gl.uniformMatrix4fv(ProjectionLoc, false, flatten(projection));  // send projection matrix to the new shader program

        gl.enableVertexAttribArray(CoordsLoc);
        gl.enableVertexAttribArray(NormalLoc);
        gl.enableVertexAttribArray(TexCoordLoc);  // we do not need texture coordinates

        changeActivateTex();
        traverse(carlingueId);
        changeActivateTex();
        //requestAnimFrame(render);
    }
}



function unflatten(matrix) {
    var result = mat4();
    result[0][0] = matrix[0]; result[1][0] = matrix[1]; result[2][0] = matrix[2]; result[3][0] = matrix[3];
    result[0][1] = matrix[4]; result[1][1] = matrix[5]; result[2][1] = matrix[6]; result[3][1] = matrix[7];
    result[0][2] = matrix[8]; result[1][2] = matrix[9]; result[2][2] = matrix[10]; result[3][2] = matrix[11];
    result[0][3] = matrix[12]; result[1][3] = matrix[13]; result[2][3] = matrix[14]; result[3][3] = matrix[15];

    return result;
}

function extractNormalMatrix(matrix) { // This function computes the transpose of the inverse of 
    // the upperleft part (3X3) of the modelview matrix (see http://www.lighthouse3d.com/tutorials/glsl-tutorial/the-normal-matrix/ )

    var result = mat3();
    var upperleft = mat3();
    var tmp = mat3();

    upperleft[0][0] = matrix[0][0];  // if no scaling is performed, one can simply use the upper left
    upperleft[1][0] = matrix[1][0];  // part (3X3) of the modelview matrix
    upperleft[2][0] = matrix[2][0];

    upperleft[0][1] = matrix[0][1];
    upperleft[1][1] = matrix[1][1];
    upperleft[2][1] = matrix[2][1];

    upperleft[0][2] = matrix[0][2];
    upperleft[1][2] = matrix[1][2];
    upperleft[2][2] = matrix[2][2];

    tmp = matrixinvert(upperleft);
    result = transpose(tmp);

    return result;
}

function matrixinvert(matrix) {

    var result = mat3();

    var det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[2][1] * matrix[1][2]) -
                 matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
                 matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

    var invdet = 1 / det;

    // inverse of matrix m
    result[0][0] = (matrix[1][1] * matrix[2][2] - matrix[2][1] * matrix[1][2]) * invdet;
    result[0][1] = (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invdet;
    result[0][2] = (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invdet;
    result[1][0] = (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invdet;
    result[1][1] = (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invdet;
    result[1][2] = (matrix[1][0] * matrix[0][2] - matrix[0][0] * matrix[1][2]) * invdet;
    result[2][0] = (matrix[1][0] * matrix[2][1] - matrix[2][0] * matrix[1][1]) * invdet;
    result[2][1] = (matrix[2][0] * matrix[0][1] - matrix[0][0] * matrix[2][1]) * invdet;
    result[2][2] = (matrix[0][0] * matrix[1][1] - matrix[1][0] * matrix[0][1]) * invdet;

    return result;
}


function createModel(modelData) {
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.normalBuffer = gl.createBuffer();
    model.textureBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();

    model.count = modelData.indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexTextureCoords, gl.STATIC_DRAW);

    //console.log(modelData.vertexPositions.length);
    //console.log(modelData.indices.length);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);

    model.render = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(CoordsLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(NormalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        gl.uniformMatrix4fv(ModelviewLoc, false, flatten(modelview));    //--- load flattened modelview matrix
        gl.uniformMatrix3fv(NormalMatrixLoc, false, flatten(normalMatrix));  //--- load flattened normal matrix

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
        //console.log(this.count);
    };
    return model;
}



function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    var vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vertexShaderSource);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
    }
    var fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}


function getTextContent(elementID) {
    var element = document.getElementById(elementID);
    var fsource = "";
    var node = element.firstChild;
    var str = "";
    while (node) {
        if (node.nodeType == 3) // this is a text node
            str += node.textContent;
        node = node.nextSibling;
    }
    return str;
}


window.onload = function init() {
    var canvas = document.getElementById("glcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        gl = canvas.getContext("experimental-webgl");
    }
    if (!gl) {
       throw "Could not create WebGL context.";
    }

    // LOAD SHADER (standard texture mapping)
    var vertexShaderSource = getTextContent("vshader");
    var fragmentShaderSource = getTextContent("fshader");
    prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    gl.useProgram(prog);

    // locate variables for further use
    CoordsLoc = gl.getAttribLocation(prog, "vcoords");
    NormalLoc = gl.getAttribLocation(prog, "vnormal");
    TexCoordLoc = gl.getAttribLocation(prog, "vtexcoord");

    ModelviewLoc = gl.getUniformLocation(prog, "modelview");
    ProjectionLoc = gl.getUniformLocation(prog, "projection");
    NormalMatrixLoc = gl.getUniformLocation(prog, "normalMatrix");

    texture = gl.getUniformLocation(prog, "texture");

    gl.enableVertexAttribArray(CoordsLoc);
    gl.enableVertexAttribArray(NormalLoc);
    gl.enableVertexAttribArray(TexCoordLoc);

    gl.uniform1i(gl.getUniformLocation(prog, "phong"), 1); //init phong
    gl.uniform1i(gl.getUniformLocation(prog, "activateTex"), 0); //init activateTex

    // LOAD ENVIRONMENT SHADER (for the environment)
    var vertexShaderSourceBox = getTextContent("vshaderbox");
    var fragmentShaderSourceBox = getTextContent("fshaderbox");
    progbox = createProgram(gl, vertexShaderSourceBox, fragmentShaderSourceBox);

    gl.useProgram(progbox);

    aCoordsbox = gl.getAttribLocation(progbox, "vcoords");
    aNormalbox = gl.getAttribLocation(progbox, "vnormal");
    aTexCoordbox = gl.getAttribLocation(progbox, "vtexcoord");

    uModelviewbox = gl.getUniformLocation(progbox, "modelview");
    uProjectionbox = gl.getUniformLocation(progbox, "projection");

    uEnvbox = gl.getUniformLocation(progbox, "skybox");

    // Fin load Environment

    gl.enable(gl.DEPTH_TEST);

    //  create a "rotator" monitoring mouse mouvement
    rotator = new SimpleRotator(canvas, render);
    //  set initial camera position at z=40, with an "up" vector aligned with y axis
    //   (this defines the initial value of the modelview matrix )
    rotator.setView([0, 0, 1], [0, 1, 0], 40);

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    //Initialize texture
    initTexture();

    // Permet la création des modèles : Modèles initialisés dans basic-objects-IFS

    cube1 = createModel(cube(10));
    trapeze1 = createModel(trapeze1(10));
    trapeze2 = createModel(trapeze2(10));
    trapeze3 = createModel(trapeze3(10));
    cylindre = createModel(uvCylinder(1, 10, 32, false, false));
    cylindreNoBottom = createModel(uvCylinder(1, 10, 32, true, false));
    triangle = createModel(triangle(10));
    cylinderQuart = createModel(cylinderQuart(4, 1.5, 32));

    envbox = createModelbox(cube(1000));

    for (var i = 0; i < numNodes; i++) initNodes(i);

    render();
};




/**
 * Notes:
 * - Coordinates are specified as (X, Y, Z) where X and Z are horizontal and Y
 *   is vertical
 */
// Semi-constants
var WIDTH = window.innerWidth,
	HEIGHT = window.innerHeight,
	ASPECT = WIDTH / HEIGHT,
	UNITSIZE = 50,
	MOVESPEED = 100,
	BULLETMOVESPEED = MOVESPEED * 5;
var firstClick = true;
// Global vars
var bgAudio,shotAudio, good, bad, welcome;
var t = THREE, scene, cam, renderer, score, controls, clock, projector, model, skin, raycaster, clowns;
var runAnim = true, mouse = { x: 0, y: 0 };


// Initialize and run on document ready
$(document).ready(function() {
	$('body').append('<div id="intro">Click to start</div>');
	$('#intro').css({width: WIDTH, height: HEIGHT}).one('click', function(e) {
		e.preventDefault();
		$(this).fadeOut();
		init();
		animate();
	});
});

// Setup
function init() {
	clock = new t.Clock(); // Used in render() for controls.update()
	projector = new t.Projector(); // Used in bullet projection
	scene = new t.Scene(); // Holds all objects in the canvas
	scene.fog = new t.FogExp2(0xD6F1FF, 0.0005); // color, density
	score = 0;
	// Set up camera
	cam = new t.PerspectiveCamera(60, ASPECT, 1, 10000); // FOV, aspect, near, far
	cam.position.y = 20;
	scene.add(cam);
	
		// Audio
	welcome = document.querySelector("#welcomeAudio");
	welcome.volume = 0.2;
	good = document.querySelector("#goodAudio");
	good.volume = 0.2;
	bad = document.querySelector("#badAudio");
	bad.volume = 0.2;
	bgAudio = document.querySelector("#bgAudio");
	bgAudio.volume=0.2;
	shotAudio = document.querySelector("#shotAudio");
	shotAudio.volume=0.2;
	
	welcome.play();
	console.log(bgAudio);
	
	// World objects
	clowns = [];
	setupScene();
	
	// Handle drawing as WebGL (faster than Canvas but less supported)
	renderer = new t.WebGLRenderer();
	renderer.setSize(WIDTH, HEIGHT);
	renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
	
	// Add the canvas to the document
	renderer.domElement.style.backgroundColor = '#D6F1FF'; // easier to see
	document.body.appendChild(renderer.domElement);
	
	// Track mouse position so we know where to shoot
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	
	// Shoot on click
	$(document).click(function(e) {
		e.preventDefault;
		if(firstClick){
			firstClick = false;
			return;
		}
		if (e.which === 1) { // Left click only
			shotAudio.currentTime = 0;
			shotAudio.play();
			createBullet();
		}
	});
	
	// Display HUD
	$('body').append('<div id="hud"><p>Score: <span id="score">0</span></p></div>');
	$('body').append('<div id="credits"><p>Created by William Powell using <a href="http://mrdoob.github.com/three.js/">Three.js</a><br />Click to shoot</p></div>');
}
function stopBGAudio(){
	bgAudio.pause();
	bgAudio.currentTime = 0;
}
function playBGAudio(){
	bgAudio.play();
}

// Helper function for browser frames
function animate() {
	if (runAnim) {
		requestAnimationFrame(animate);
	}
	render();
}

// Update and display
function render() {
	var delta = clock.getDelta(), speed = delta * BULLETMOVESPEED;

	// Update bullets. Walk backwards through the list so we can remove items.
	for (var i = bullets.length-1; i >= 0; i--) {
		var b = bullets[i], p = b.position, d = b.ray.direction;
		b.translateX(speed * d.x);
		b.translateZ(speed * d.z);
		if (p.z < -150) {
			var closest = null;
			var distance = 9999;
			for(var j = 0; j < clowns.length; j++)
			{
				if(Math.abs(clowns[j].position.x - p.x  < distance))
				{
					distance = Math.abs(clowns[j].position.x - p.x);
					closest = clowns[j];
				} 
			}
			bullets.splice(i, 1);
			scene.remove(b);
			if(closest.rotation.x == 0)
			{
				score++;
				$('#score').html(score);
				closest.rotation.x = Math.pi / 2;
				if (good.duration > 0 && !good.paused) {
					continue;
				}
				else{
					if (bad.duration > 0 && !bad.paused) {
						bad.pause();
						bad.currentTime = 0;
					}
					good.play();
				}
			}
			else
			{
				if (good.duration > 0 && !good.paused) {
					continue;
				}
				if (bad.duration > 0 && !bad.paused) {
					continue;
				}
				bad.play();
			}
		}
	}
	
	

	renderer.render(scene, cam); // Repaint
	
}

// Set up the objects in the world
function setupScene() {

	var floor = new t.Mesh(
			new t.CubeGeometry(10 * UNITSIZE, 1, 15 * UNITSIZE),
			new t.MeshLambertMaterial({color: 0xEDCBA0,/*map: t.ImageUtils.loadTexture('images/floor-1.jpg')*/})
	);
	floor.position.y = 0;
	scene.add(floor);
	var cube = new t.CubeGeometry(UNITSIZE, 3 * UNITSIZE, 1);
	var material = new t.MeshLambertMaterial({/*color: 0xC5EDA0,*/map: t.ImageUtils.loadTexture('images/wall.jpg')});
	
	for(var i = -3; i <= 3; i++)
	{
		var c = new THREE.Mesh(cube, material);
		c.position.z = -150;
		c.position.x = UNITSIZE * i;
		c.rotation.x = Math.PI/2;
		c.position.y = -1;
		clowns.push(c);
		scene.add(c);
	}
	
	// Audio
	playBGAudio();
	
	// Lighting
	var directionalLight1 = new t.DirectionalLight( 0xFFFFFF, 0.7 );
	directionalLight1.position.set( 0, 0, 1 );
	scene.add( directionalLight1 );
	var directionalLight2 = new t.DirectionalLight( 0xFFFFFF, 0.7 );
	directionalLight2.position.set( 0, 1, 0 );
	scene.add( directionalLight2 );
	
	setInterval(raiseClown, 750);
}
function raiseClown(){
	console.log(Math.random() * clowns.length);
	clowns[Math.floor(Math.random() * clowns.length)].rotation.x = 0;
}

function getMapSector(v) {
	//var x = Math.floor((v.x + UNITSIZE / 2) / UNITSIZE + mapW/2);
	//var z = Math.floor((v.z + UNITSIZE / 2) / UNITSIZE + mapW/2);
	return {x: 0, z: 0};
}

var bullets = [];
var sphereMaterial = new t.MeshBasicMaterial({color: 0x333333});
var sphereGeo = new t.SphereGeometry(2, 6, 6);
function createBullet() {
	var sphere = new t.Mesh(sphereGeo, sphereMaterial);
	sphere.position.set(cam.position.x, cam.position.y * .9, cam.position.z);

	var vector = new t.Vector3(mouse.x, mouse.y, 0.5);
	projector.unprojectVector(vector, cam);
	console.log(vector.normalize());
	sphere.ray = new t.Ray(
			cam.position,
			vector.normalize()
	);
	sphere.owner = cam;
	bullets.push(sphere);
	scene.add(sphere);
	
	return sphere;
}

function onDocumentMouseMove(e) {
	e.preventDefault();
	mouse.x = (e.clientX / WIDTH) * 2 - 1;
	mouse.y = - (e.clientY / HEIGHT) * 2 + 1;
}

// Handle window resizing
$(window).resize(function() {
	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;
	ASPECT = WIDTH / HEIGHT;
	if (cam) {
		cam.aspect = ASPECT;
		cam.updateProjectionMatrix();
	}
	if (renderer) {
		renderer.setSize(WIDTH, HEIGHT);
	}
	$('#intro, #hurt').css({width: WIDTH, height: HEIGHT,});
});

$(window).focus(function() {
	if (controls) controls.freeze = false;
});
$(window).blur(function() {
	if (controls) controls.freeze = true;
});





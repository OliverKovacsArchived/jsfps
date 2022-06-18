
class Game {
    constructor() {
        this.player = new Player();

        this.canvas = [];
        this.ctx = [];


        //this.map_src = this.generateMap(256 * 32, 256 * 32);
        this.map_src = this.generateMap(500, 500, "RGB#", "                                                        RGB#");
        //this.map_src = this.generateMap(64, 64, "RGB#", "                                                        RGB#");
        this.map = this.loadMap(this.map_src);
        this.displayMap = false;

        this.config = {
            pxs: new Vector2(4, 4),
            screen: new Vector2(400, 200),
            screen_canvas: new Vector2(),
            bgColor: { r: 0, g: 0, b: 0 },
            bgColorSlope: { r: 0.15, g: 0.15, b: 0.15 },
            //bgColor: { r: 50, g: 50,b: 50 },
            //bgColorSlope: { r: -0.15, g: -0.15, b: -0.15 },
            bgDebug: true,
            wallDistance: 0.5,
            wallHeight: 1,
            accuracy: 0.001,
            dynamicAcc: true,
            dynamicAccTarget: 17,
            distance: 200
        };

        this.config.screen_canvas = this.config.screen.copy().multiply(this.config.pxs)

        this.accuracy = this.config.accuracy

        this.rays = [];
        this.wall = [];
        this.ray_alpha_delta = this.player.fov / this.config.screen.x;
        this.ray_vector = new Vector2();

        this.hex = "0123456789ABCDEF";

        this.loadCanvas();

        document.addEventListener("keydown", event => {
            switch (event.keyCode) {
                case 77: {
                    this.displayMap = !this.displayMap;
                    document.querySelector("#map").innerHTML = "";
                    break;
                }
                case 78: {
                    this.map_src = this.generateMap(64, 64, "RGB", "         RGB");
                    this.map = this.loadMap(this.map_src);
                    break;
                }
                case 66: {
                    this.config.dynamicAcc = !this.config.dynamicAcc;
                    this.accuracy = this.config.accuracy;
                }
                case 49: {

                }
                case 50: {
                    
                }
            }
        });
    }

    loadCanvas() {
        let container = document.querySelector(`#canvas_container`);
        container.style.width = `${this.config.screen_canvas.x}px`;
        container.style.height = `${this.config.screen_canvas.y}px`;
        container.width = this.config.screen_canvas.x;
        container.height = this.config.screen_canvas.y;

        for (let i = 0; i < 3; i++) {
            let canvas = document.createElement("canvas");
            canvas.id = `canvas_layer${i}`;
            canvas.width = this.config.screen_canvas.x;
            canvas.height = this.config.screen_canvas.y;
            canvas.style.width = `${this.config.screen_canvas.x}px`;
            canvas.style.height = `${this.config.screen_canvas.y}px`;
            canvas.style.zIndex = i;
            canvas.style.position = "absolute";
            canvas.style.border = "1px solid #000000";
            canvas.style.float = "left";
            this.canvas[i] = canvas;
            this.ctx[i] = canvas.getContext("2d");
            this.ctx[i].imageSmoothingEnabled = false;
            document.querySelector("#canvas_container").appendChild(canvas);
        }
    }

    generateMap(x = 16, y = 16, wall = "#", characters = "#   ") {
        let map = [];
        for(let i = 0; i < x; i++) {
            if (i == 0 || i == x - 1) map[i] = `${this.randomString(wall, y)}`;
            else map[i] = `${this.randomString(wall, 1)}${this.randomString(characters, y - 2)}${this.randomString(wall, 1)}`;
        }
        return map;
    }

    loadMap(map_src) {
        let map = [];
        for (let i = 0; i < this.map_src.length; i++) {
            map[i] = map_src[i].split("");
        }
        return map;
    }

    fillBackground() {
        for (let i = 0; i < this.config.screen.y; i++) {
            let color = {
                r: this.config.bgColor.r + this.config.bgColorSlope.r * Math.abs(i * this.config.pxs.y - (this.config.screen_canvas.y / 2)),
                g: this.config.bgColor.g + this.config.bgColorSlope.g * Math.abs(i * this.config.pxs.y - (this.config.screen_canvas.y / 2)),
                b: this.config.bgColor.b + this.config.bgColorSlope.b * Math.abs(i * this.config.pxs.y - (this.config.screen_canvas.y / 2))
            };
            if (color.r < 0) color.r = 0;
            if (color.g < 0) color.g = 0;
            if (color.b < 0) color.b = 0;
            this.ctx[0].fillStyle = `#${this.byte2hex(color.r)}${this.byte2hex(color.g)}${this.byte2hex(color.b)}`;
            this.ctx[0].fillRect(0, i * this.config.pxs.y, this.config.screen_canvas.x, this.config.pxs.y);
        }
        if (this.config.bgDebug) {
            for (let i = 0; i < this.config.screen.x; i++) {
                if (i % 2 == 0) this.ctx[0].fillStyle = `#FFFFFF`;
                else this.ctx[0].fillStyle = `#000000`;
                this.ctx[0].fillRect(i * this.config.pxs.x, 0, this.config.pxs.x, this.config.pxs.y);
            }
            for (let i = 0; i < this.config.pxs.x; i++) {
                if (i % 2 == 0) this.ctx[0].fillStyle = `#FFFFFF`;
                else this.ctx[0].fillStyle = `#000000`;
                this.ctx[0].fillRect(i, 0, 1, 1);
            }
        }
    }

    start() {
        this.fillBackground();
        this.ms = -16

        this.loop(0);
    }

    loop(ts) {
        window.requestAnimationFrame(ts => this.loop(ts));
        let dt = ts - this.ms;
        this.ms = ts;

        this.update(dt);
        this.render(dt);
    }

    update(dt) {
        if (this.config.dynamicAcc) this.accuracy = this.accuracy * dt / this.config.dynamicAccTarget;

        this.player.direction.fromAngle(this.player.rotation);
        this.player.orthogonal_direction.fromAngle(this.player.rotation - Math.PI / 2)
        if (kb.isDown(kb.key.w)) {
            this.player.position.add(this.player.direction.copy().scalar(this.player.speed * dt));
        }
        if (kb.isDown(kb.key.s)) {
            this.player.position.add(this.player.direction.copy().scalar(-this.player.speed * dt));
        }
        if (kb.isDown(kb.key.a)) {
            this.player.position.add(this.player.orthogonal_direction.copy().scalar(this.player.speed * dt));
        }
        if (kb.isDown(kb.key.d)) {
            this.player.position.add(this.player.orthogonal_direction.copy().scalar(-this.player.speed * dt));
        }
        if (kb.isDown(kb.key.arrow_right)) this.player.rotation += this.player.sensitivity * dt;
        if (kb.isDown(kb.key.arrow_left)) this.player.rotation -= this.player.sensitivity * dt;
        if (kb.isDown(kb.key.arrow_up)) this.player.fov -= 0.001 * dt;
        if (kb.isDown(kb.key.arrow_down)) this.player.fov +=  0.001 * dt;
        if (kb.isDown(kb.key.shift)) this.accuracy = 1;
        if (kb.isDown(kb.key.space)) document.querySelector("#canvas_container").innerHTML = "";

        this.ray_alpha = this.player.rotation - (this.player.fov / 2)
        this.ray_alpha_delta = this.player.fov / this.config.screen.x;

        for (let i = 0; i < this.config.screen.x; i++) {
            this.rays[i] = undefined;
            this.ray_vector.fromAngle(this.ray_alpha);
            this.ray_vector.scalar(this.accuracy)
            this.pos = this.player.position.copy();
            for (let j = 0; j < this.config.distance / this.accuracy; j++) {
                this.pos.add(this.ray_vector);
                if (this.map[Math.round(this.pos.x)][Math.round(this.pos.y)] != " ") {
                    this.rays[i] = j * this.accuracy;
                    this.wall[i] = this.map[Math.round(this.pos.x)][Math.round(this.pos.y)];
                    break;
                }
            }
            this.ray_alpha += this.ray_alpha_delta;
        }
    }

    render(dt) {
        this.ctx[1].clearRect(0, 0, this.config.screen_canvas.x, this.config.screen_canvas.y);

        document.querySelector("#stats").innerHTML = `(${Math.round(this.player.position.x)}|${Math.round(this.player.position.y)}) ${this.map.length}x${this.map[0].length}map<br>
        ${Math.round(dt)}dt/${Math.round(1000/dt)}fps<br>
        ${this.config.screen.x}x${this.config.screen.y}res (${this.config.pxs.x}x${this.config.pxs.y}pxs) ${this.config.distance}dist ${this.accuracy}acc<br>
        dynamic_acc: ${this.config.dynamicAcc} target_dt: ${this.config.dynamicAccTarget}`;

        if (this.displayMap) {
            this.map_copy = this.map2txt(this.map, "<br>")
            this.map_copy = this.encodeWhiteSpaces(this.map_copy);
            document.querySelector("#map").innerHTML = this.map_copy;
        }

        for (let i = 0; i < this.config.screen.x; i++) {

            this.ceiling = this.wallCeiling(this.rays[i]);

            this.ctx[1].fillStyle = this.wallColor(this.rays[i], this.wall[i]);
            this.ctx[1].fillRect(i * this.config.pxs.x, this.ceiling * this.config.pxs.y, this.config.pxs.x, (this.config.screen.y - 2 * this.ceiling) * this.config.pxs.y)
        }
    }

    wallColor(distance, character) {
        let n = 170 - distance * 12;
        if (n < 0) n = 0;
        let color = this.byte2hex(n);
        //return `#${color}${color}${color}`;
        /*switch (character) {
            case "R": return `#${color}0000`;
            case "G": return `#00${color}00`;
            case "B": return `#0000${color}`;
            case "#": return `#${color}${color}${color}`;
        }*/

        n = distance;
        color = {
            r: this.sineCycle(n, 0.5, 0) * 127 + 128,
            g: this.sineCycle(n, 0.5, 2 * Math.PI / 3) * 127 + 128,
            b: this.sineCycle(n, 0.5, 4 * Math.PI / 3) * 127 + 128
        };
        return `#${this.byte2hex(color.r)}${this.byte2hex(color.g)}${this.byte2hex(color.b)}`
    }

    wallCeiling(distance) {
        return (this.config.screen.y / 2) + this.config.wallDistance - (this.config.screen.y / (distance + 0.0001) / this.config.wallHeight);
    }

    byte2hex(n) {
        return String(this.hex.substr((n >> 4) & 0x0F, 1)) + this.hex.substr(n & 0x0F, 1);
    }

    map2txt(map, join = "\n") {
        let txt = [];
        for (let i = 0; i < map.length; i++) {
            txt[i] = [...map[i]]
        }
        txt[Math.round(this.player.position.x)][Math.round(this.player.position.y)] = "O";
        for (let i = 0; i < txt.length; i++) {
            txt[i] = txt[i].join("");
        }
        return txt.join(join);
    }

    sineCycle(index, frequency, phase) {
        return Math.sin(index * frequency + phase);
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    randomString(strChars, strLength) {
        let str = "";
        for (let i = 0; i < strLength; i++) {
            str += strChars.charAt(this.randomInt(0, strChars.length - 1));;
        }
        return str;
    }

    encodeWhiteSpaces = str => {
        return str.split("").map(char => {
            if (char === " ") return "&nbsp;"
            else return char;
        }).join("");
    }
}

class Player {
    constructor(position, rotation) {
        this.position = position || new Vector2(3, 3);
        this.rotation = rotation || 0;
        this.direction = new Vector2();
        this.orthogonal_direction = new Vector2();
        this.speed = 0.005;
        this.sensitivity = 0.001;
        this.fov = 1;
    }
}

class Keyboard {
    constructor(mode) {
        this.keys = [];
        this.key = {
            w: 87,
            a: 65,
            s: 83,
            d: 68,
            space: 32,
            shift: 16,
            ctrl: 17,
            esc: 27,
            arrow_up: 38,
            arrow_down: 40,
            arrow_left: 37,
            arrow_right: 39
        };

        for (let i = 0; i < 222; i++) {
            this.keys[i] = mode || "up";
        }

        document.addEventListener("keyup", event => this.keys[event.keyCode] = "up");
        document.addEventListener("keydown", event => this.keys[event.keyCode] = "down");
    }

    isUp(keyCode) {
        if (this.keys[keyCode] == "down") {
            return false;
        }
        return true;
    }

    isDown(keyCode) {
        if (this.keys[keyCode] == "up") {
            return false;
        }
        return true;
    }

    getKeyState(keyCode) {
        return this.keys[keyCode];
    }
}



class Vector2 {
    constructor(x, y) {
        if (x && !y) this.fromObject(x);
        else {
            this.x = x || 0;
            this.y = y || 0;
            return this;
        }
    }



    fromArray(arr) {
        this.x = arr[0] || 0;
        this.y = arr[1] || 0;
        return this;
    }

    fromObject(obj) {
        this.x = obj.x || 0;
        this.y = obj.y || 0;
        return this;
    }

    fromPoints(x1, y1, x2, y2) {
        this.x = x2 - x1;
        this.y = y2 - y1;
        return this;
    }

    toArray() {
        return [ this.x, this.y ];
    }

    toObject() {
        return { x: this.x, y: this.y };
    }

    toText() {
        return `x: ${this.x}, y: ${this.y}`;
    }

    copy() {
        return new Vector2(this.x, this.y);
    }


    add(vec) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }

    addX(vec) {
        this.x += vec.x;
        return this;
    }

    addY(vec) {
        this.y += vec.y;
        return this;
    }

    subtract(vec) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }

    subtractX(vec) {
        this.x -= vec.x;
        return this;
    }

    subtractY(vec) {
        this.y -= vec.y;
        return this;
    }

    multiply(vec) {
        this.x *= vec.x;
        this.y *= vec.y;
        return this;
    }

    multiplyX(vec) {
        this.x *= vec.x;
        return this;
    }

    multiplyY(vec) {
        this.y *= vec.y;
        return this;
    }

    divide(vec) {
        this.x /= vec.x;
        this.y /= vec.y;
        return this;
    }

    divideX(vec) {
        this.x /= vec.x;
        return this;
    }

    divideY(vec) {
        this.y /= vec.y;
        return this;
    }

    bias(c) {
        this.x += c;
        this.y += c;
        return this;
    }

    biasX(c) {
        this.x += c;
        return this;
    }

    biasY(c) {
        this.y += c;
        return this;
    }

    scalar(c) {
        this.x *= c;
        this.y *= c;
        return this;
    }

    scalarX(c) {
        this.x *= c;
        return this;
    }

    scalarY(c) {
        this.y *= c;
        return this;
    }


    
    unit() {
        let length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    };
    
    norm() {
        this.unit();
        return this;
    };
    
    normalize() {
        this.unit();
        return this;
    };

    invert() {
        this.scalar(-1);
        return this;
    }

    invertX() {
        this.scalarX(-1);
        return this;
    }

    invertY() {
        this.scalarY(-1);
        return this;
    }

    sq() {
        this.x = Math.pow(this.x, 2);
        this.y = Math.pow(this.y, 2);
        return this;
    }

    sqX() {
        this.x = Math.pow(this.x, 2);
        return this;
    }

    sqY() {
        this.y = Math.pow(this.y, 2);
        return this;
    }

    sqrt() {
        this.x = Math.sqrt(this.x);
        this.y = Math.sqrt(this.y);
        return this;
    }

    sqrtX() {
        this.x = Math.sqrt(this.x);
        return this;
    }

    sqrtY() {
        this.y = Math.sqrt(this.y);
        return this;
    }
    
    limit(limit) {
        if (this.x > limit) {
            this.y *= (limit / this.x);
            this.x = limit;
        }
        if (this.y > limit) {
            this.x *= (limit / this.y);
            this.y = limit;
        }
        return this;
    };
    
    limitX(limit) {
        if (this.x > limit) {
            this.y *= (limit / this.x);
            this.x = limit;
        }
        return this;
    };
    
    limitY(limit) {
        if (this.y > limit) {
            this.x *= (limit / this.y);
            this.y = limit;
        }
        return this;
    };

    limitLength() {
        if (a.length() > limit) {
            let length = this.length()
            this.x *= (limit / length);
            this.y *= (limit / length);
        }
        return this;
    }
    
    round(p = 0) {
        this.x = JSON.parse(this.x.toFixed(p));
        this.y = JSON.parse(this.y.toFixed(p));
        return this;
    };
    
    roundX(p = 0) {
        this.x = JSON.parse(this.x.toFixed(p));
        return this;
    };
    
    roundY(p = 0) {
        this.y = JSON.parse(this.y.toFixed(p));
        return this;
    };

    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    floorX() {
        this.x = Math.floor(this.x);
        return this;
    }

    floorY() {
        this.y = Math.floor(this.y);
        return this;
    }



    toAngle() {
        return Math.atan2(this.y, this.x);
    }

    toAngleDeg() {
        return Math.atan2(this.y, this.x) / Math.PI * 180;
    }

    fromAngle(angle, length) {
        this.x = Math.sin(angle) * (length || 1);
        this.y = Math.cos(angle) * (length || 1);
        return this;
    }

    fromAngleDeg(angle, length) {
        this.x = Math.sin(angle / 180 * Math.PI) * (length || 1);
        this.y = Math.cos(angle / 180 * Math.PI) * (length || 1);
        return this;
    }

    toPolar() {
        let angle = this.toAngle();
        this.x = this.length();
        this.y = angle;
        return this;
    }

    toCartesian() {
        let length = this.x;
        this.x = Math.sin(this.y) * length;
        this.y = Math.cos(this.y) * length;
        return this;
    }

    rotate(angle) {
        this.toPolar()
            .biasY(angle)
            .toCartesian();
        return this;
    }

    rotateDeg(angle) {
        this.toPolar()
            .biasY(angle / 180 * Math.PI)
            .toCartesian();
        return this;
    }

    rotateAround(vec, angle, length) {
        this.subtract(vec)
            .toPolar()
            .biasX(length)
            .biasY(angle)
            .toCartesian()
            .add(vec);
        return this;
    }

    rotateAroundDeg(vec, angle, length) {
        this.subtract(vec)
            .toPolar()
            .biasX(length)
            .biasY(angle / 180 * Math.PI)
            .toCartesian()
            .add(vec);
        return this;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    lengthSq() {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }

    magnitude() {
        return this.length();
    }

    min() {
        return Math.min(this.x, this.y);
    }

    max() {
        return Math.max(this.x, this.y);
    }

    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }

    cross(vec) {
        return this.x * vec.y - this.y * vec.x;
    }

    distanceX(vec) {
        return vec.x - this.x;
    }

    distanceY(vec) {
        return vec.y - this.y;
    }

    distanceXAbs(vec) {
        return Math.abs(this.distanceX(vec));
    }

    distanceYAbs(vec) {
        return Math.abs(this.distanceY(vec));
    }
    
    angleToVector(vec) {
        return Math.acos(this.dot(vec) / (this.length() * vec.length()));
    };

    angleToVectorDeg(vec) {
        return Math.acos(this.dot(vec) / (this.length() * vec.length())) / Math.PI * 180;
    };
    
    orthogonal(b) {
        return this.dot(b) == 0;
    };

    equal(vec) {
        return this.x == vec.x && this.y == vec.y;
    };
    
    equalX(vec) {
        return this.x == vec.x;
    };
    
    equalY(vec) {
        return this.y == vec.y;
    };
}

let kb = new Keyboard();
let game;

window.onload = () => {
    game = new Game();
    game.start();
};
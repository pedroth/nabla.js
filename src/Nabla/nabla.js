const Canvas = require("../Canvas/main/Canvas.js");
const Canvas2D = require("../Canvas/main/Canvas2D.js");
const ImageIO = require("../Canvas/main/ImageIO.js");
const Stream = require("../Stream/main/Stream.js");
const ArrayUtils = require("../ArrayUtils/main/ArrayUtils");
const Sort = require("../Sort/main/Sort");

const Nabla = {};

Nabla.Canvas = Canvas;
Nabla.Canvas2D = Canvas2D;
Nabla.ImageIO = ImageIO;
Nabla.Stream = Stream;
Nabla.ArrayUtils = ArrayUtils;
Nabla.Sort = Sort;

module.exports.default = Nabla;

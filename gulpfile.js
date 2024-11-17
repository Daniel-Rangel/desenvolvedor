const path = require("path");

const { series, src, dest, parallel, watch } = require("gulp");
const webpack = require("webpack");
const del = require("del");
const autoprefixer = require("gulp-autoprefixer");
const sass = require("gulp-sass")(require("sass"));
const sourcemaps = require("gulp-sourcemaps");
const browserSync = require("browser-sync").create();

const webpackConfig = require("./webpack.config.js");

const paths = {
  scripts: {
    src: "src/ts/index.ts",
    watch: "src/ts/**/*.ts",
  },
  styles: {
    src: "src/scss/**/*.scss", 
  },  
  img: {
    src: "src/assets/img/**/*",
  },
  svg: {
    src: "src/assets/svg/**/*",
  },
  html: {
    src: "src/index.html",
  },
  dest: "dist",
  temp: ".tmp",
};

function clean() {
  return del([paths.dest, paths.temp]);
}

function server() {
  browserSync.init({
    server: {
      baseDir: "./dist",
    },
  });
}

function styles() {
  return src(paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(
      autoprefixer({
        cascade: false,
      })
    )
    .pipe(sourcemaps.write())
    .pipe(dest(paths.dest))
    .pipe(browserSync.stream());
}

function scripts() {
  return new Promise((resolve) =>
    webpack(webpackConfig(paths), (err, stats) => {
      if (err) console.log("Webpack", err);

      console.log(
        stats.toString({
          all: false,
          modules: true,
          maxModules: 0,
          errors: true,
          warnings: true,
          moduleTrace: true,
          errorDetails: true,
          colors: true,
          chunks: true,
        })
      );

      resolve();
    })
  );
}

function html() {
  return src(paths.html.src).pipe(browserSync.stream()).pipe(dest(paths.dest));
}

function img() {
  return src(paths.img.src).pipe(dest(paths.dest + "/assets/img"));
}

function svg() {
  return src(paths.svg.src).pipe(dest(paths.dest + "/assets/svg"));
}


const build = series(clean, parallel(styles, scripts, html, img));
const chokidar = require("chokidar");

const dev = () => {
  chokidar.watch(paths.scripts.watch).on("all", scripts);
  chokidar.watch(paths.styles.src).on("all", styles);
  chokidar.watch(paths.img.src).on("all", img);
  chokidar.watch(paths.svg.src).on("all", svg);
  chokidar.watch(paths.html.src).on("all", html).on("change", browserSync.reload);

  server();
};


exports.build = build;
exports.server = server;
exports.styles = styles;
exports.scripts = scripts;
exports.default = dev;

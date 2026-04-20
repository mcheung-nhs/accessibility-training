// Core dependencies
const { spawn } = require('child_process');
const gulp = require('gulp');

// External dependencies
const babel = require('gulp-babel');
const browserSync = require('browser-sync');
const clean = require('gulp-clean');
var sass = require('gulp-sass')(require('sass'));

// Local dependencies
const config = require('./app/config');

// Set configuration variables
const port = process.env.PORT || config.port;

// Delete all the files in /public build directory
function cleanPublic() {
  return gulp.src('public', { allowEmpty: true})
  .pipe(clean());
}

sass.compiler = require('sass');

// Compile SASS to CSS
function compileStyles() {
  return gulp.src([
    'app/assets/sass/**/*.scss'
  ])
    .pipe(sass())
    .pipe(gulp.dest('public/css'))
    .on('error', (err) => {
      console.log(err)
      process.exit(1)
    });
}

// Compile JavaScript (with ES6 support)
function compileScripts() {
  return gulp.src([
    'app/assets/javascript/**/*.js'
  ])
  .pipe(babel())
  .pipe(gulp.dest('public/js'));
}

// Compile assets
function compileAssets() {
  return gulp.src([
    'app/assets/**/**/*.*',
    '!**/assets/**/**/*.js', // Don't copy JS files
    '!**/assets/**/**/*.scss', // Don't copy SCSS files
  ])
  .pipe(gulp.dest('public'));
}

// Start nodemon
function startNodemon(done) {
  const server = spawn(process.execPath, [
    './node_modules/nodemon/bin/nodemon.js',
    '--watch', 'app.js',
    '--watch', 'app',
    '--watch', 'lib',
    '--watch', 'middleware',
    '--watch', 'app/views',
    '--ext', 'scss,js,html',
    '--quiet',
    'app.js'
  ], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  let starting = false;
  let ready = false;
  let readyTimer;

  const onReady = () => {
    if (ready) {
      return;
    }

    clearTimeout(readyTimer);
    ready = true;
    starting = false;
    done();
  };

  server.stdout.on('data', (chunk) => {
    var output = chunk.toString();

    process.stdout.write(output);
    if (starting || output.indexOf('starting `') !== -1 || output.indexOf('restarting due to changes') !== -1) {
      onReady();
    }
  });

  server.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  server.on('spawn', () => {
    starting = true;
    readyTimer = setTimeout(onReady, 1000);
  });

  server.on('error', (error) => {
    clearTimeout(readyTimer);
    done(error);
  });

  process.on('exit', () => {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  });
}

function reload() {
  browserSync.reload();
}

// Start browsersync
function startBrowserSync(done){
  browserSync.init({
    proxy: 'localhost:' + port,
    port: port + 1000,
    ui: false,
    files: 'app/views/**/*.*',
    ghostmode: false,
    open: false,
    notify: true,
    watch: true,
  }, done);
  gulp.watch("public/**/*.*").on("change", reload);
}

// Watch for changes within assets/
function watch() {
  gulp.watch('app/assets/sass/**/*.scss', compileStyles);
  gulp.watch('app/assets/javascript/**/*.js', compileScripts);
  gulp.watch('app/assets/**/**/*.*', compileAssets);
}

exports.watch = watch;
exports.compileStyles = compileStyles;
exports.compileScripts = compileScripts;
exports.cleanPublic = cleanPublic;

gulp.task('build', gulp.series(cleanPublic, compileStyles, compileScripts, compileAssets));
gulp.task('default', gulp.series(startNodemon, startBrowserSync, watch));

 var gulp = require('gulp');
var ts = require('gulp-typescript');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

// var fs = require('fs');
// var fse = require('fs-extra');
// var glob = require('glob');
// var path = require('path');
// var rename = require('gulp-rename');
// var sourcemaps = require('gulp-sourcemaps');
// var del = require('del');
// var merge = require('merge2');
// var md5 = require('MD5');
// var through = require('through2');

var distPath = './dist';
var releasePath = './release';

var paths = {
    resCopies: [
        'resource/**/*'
    ],
    copies: [
        'index.html'
    ],
    tsFiles: [
        'typings/**/*.ts',
        'src/**/*.ts'
    ],
    jsFiles: [
        'library/three.js',
        'library/jquery.js',
        'library/OrbitControls.js',
        'library/Tween.js',
        'library/oimo.js',
        'dist/main.js'
    ]
};

var tsProject = ts.createProject({
    declarationFiles: false,
    target: 'ES5',
    "module": "umd",
    out: 'app.js',
    typescript: require('typescript'),
    experimentalDecorators: true,
    noEmitOnError: true,
    sourceMap:true
});


// gulp.task('compileTs', function() {
//     return gulp.src(paths.tsFiles)
//
//         .pipe(ts(tsProject))
//         .js
//         .pipe(gulp.dest('.'));
// });

gulp.task('combineJs',['rjs'],function() {
    return gulp.src(paths.jsFiles)
        .pipe(concat('app.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('compressJs',function() {
    return gulp.src('dist/app.js')
        .pipe(concat('app.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist'));
});

var gulp = require('gulp');
var requirejsOptimize = require('gulp-requirejs-optimize');

// gulp.task('scripts', function () {
// 	return gulp.src('build/src/SKongVR.js')
// 		.pipe(requirejsOptimize())
//   //  .pipe(uglify())
// 		.pipe(gulp.dest('dist'));
// });

gulp.task('rjs', function () {
	return gulp.src('build/src/main.js')
		.pipe(requirejsOptimize(function(file) {
			return {
				name: './node_modules/almond/almond',
				optimize: 'none',
				useStrict: true,
				baseUrl: './',
				include: 'build/src/' + file.relative
			};
		}))
		.pipe(gulp.dest('dist'));
});



gulp.task('buildJs', ['combineJs'], function() {
    return gulp.src('app.js')
        .pipe(gulp.dest(distPath));
});

gulp.task('releaseJs', function() {
    return gulp.src(distPath + '/app.min.js')
        .pipe(uglify())
        .pipe(gulp.dest(distPath));
});

gulp.task('reCreateDist', function(cb) {
    fse.removeSync(distPath);
    fse.ensureDirSync(distPath);
    cb();
});

gulp.task('reCreateRelease', function(cb) {
    fse.removeSync(releasePath);
    fse.ensureDirSync(releasePath);
});

gulp.task('copy', ['reCreateDist'], function() {
    return gulp.src(paths.copies, { base: '.' })
        .pipe(gulp.dest(distPath));
});

gulp.task('copyRes', function() {
    return gulp.src(paths.resCopies, { base: '.' })
      .pipe(gulp.dest(distPath));
});


gulp.task('watch', ['compileTs', 'combineJs','notify'], function() {
    gulp.watch('src/**/*.ts', ['compileTs', 'combineJs','notify']);
});

gulp.task('atomer-watch',['combineJs'], function() {
    gulp.watch('build/**/*.js', ['combineJs']);
})

gulp.task('build', ['reCreateDist', 'compileTs', 'combineJs', 'buildJs', 'copy', 'copyRes']);

gulp.task('release', ['reCreateRelease', 'releaseJs', 'suffixMd5'])

gulp.task('suffixMd5',['releaseJs'], function() {
    var release = __dirname + '/release/';
    var source = __dirname + '/dist';
    var versions = {};
    var versionPaths = {};

    var shouldResolveFiles = [
        'index.html'
    ];

    function releaseDir(dir) {
        var relativeDir = dir.replace(source, '');
        var files = fs.readdirSync(dir);
        files.forEach(function(file) {
            if(file.indexOf('.') === 0) return;

            if(file === 'index.html') {
                fse.copySync(dir + '/' + file, release + relativeDir + '/index.html');
                return;
            }

            if(fs.statSync(dir + '/' + file).isDirectory()) {
                releaseDir(dir + '/' + file);
            } else {
                var content = fs.readFileSync(dir + '/' + file);
                var extname, basename;
                var md5code = md5(content);
                if(file.indexOf('.tt.png') !== -1) {
                    basename = file.replace('.tt.png', '');
                    extname = '.tt.png';
                }
                else if(file.indexOf('.tt.json') !== -1) {
                    basename = file.replace('.tt.json', '');
                    extname = '.tt.json';
                }
                else {
                    extname = path.extname(file);
                    basename = file.substr(0, file.lastIndexOf('.'));
                }
                var smd5code = md5code.substring(0, 7);
                var from = dir + '/' + file;
                var relativeTo = relativeDir + '/' + basename + '_' + smd5code + extname;
                var to = release + relativeTo;
                fse.copySync(from, to);

                if(relativeDir) {
                    versions[relativeDir.substr(1) + '/' + file] = smd5code;
                    versionPaths[relativeDir.substr(1) + '/' + file] = relativeTo;
                } else {
                    versions[file] = smd5code;
                    versionPaths[file] = basename + '_' + smd5code + extname;;
                }

                if(extname === '.html') {
                    shouldResolveFiles.push(to);
                }

            }
        });
    }

    releaseDir(source);

    fs.writeFileSync(__dirname + '/release/versions.json', JSON.stringify(versions, null, '  '));

    shouldResolveFiles.forEach(function(file) {
        var content;
        if(file === 'index.html') {
            file = __dirname + '/release/index.html';
        }
        content = fs.readFileSync(file, 'utf8');

        for(var oriFileName in versions) {
            content = content.replace(oriFileName, versionPaths[oriFileName]);
        }

        fs.writeFileSync(file, content, 'utf8');
    });

});

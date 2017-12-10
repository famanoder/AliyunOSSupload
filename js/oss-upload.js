
function createKey(){
	return Math.random().toString(23).slice(2,16);
}
var CHUNK_SIZE = 1024 * 1024 * 10; // 10M;

// formdata-polyfill
function OSSupload(opts) {

	this.target = opts.target || document.body;
	this.preKey = opts.preKey || '';
	this.accept = opts.accept || ['.png', 'jpg', 'zip'];
	this.maxSize = opts.maxSize;
	this.showProgress = opts.showProgress || true;
	this.keepExtensions = opts.keepExtensions;
	this.signatureUrl = opts.signatureUrl;
	this.OSSurl = opts.OSSurl;
	this.onProgress = opts.onProgress;
	this.onComplete = opts.onComplete;
	this.onError = opts.onError;
	this.onAbort = opts.onAbort;
	this.bucketParams = opts.bucketParams;

	this.xhr = null; 
	this.slicedFiles = [];
	this.ossbtn = null;
	this.fileId = 'oss-upload-file';
	this.btnState = 0;
	this.btnStates = {
			0: '选择文件',
			1: '签名中...',
			2: '上传中...',
			3: '上传完毕'
		}

	return this instanceof OSSupload? this.init(): new OSSupload(opts);
}

OSSupload.prototype = {
	constructor: OSSupload,
	init: function() {
		var btn = 'oss-upload-btn-txt';
		this.target.innerHTML = [
			'<label for="',
			this.fileId,
			'" class="oss-upload-btn">',
			'<span class="oss-upload-progress"></span>',
			'<span class="',
			btn,
			'">',
			this.btnStates[0],
			'</span><span class="oss-upload-per"></span><input type="file" id="',
			this.fileId,
			'"></label><span class="oss-upload-filename"></span>'
		].join('');
		if (!window.FormData) {
			console && console.warn && console.warn('FormData isn`t supported !, you can require formdata-polyfill');
			return;
		};
		this.ossbtn = $$('.' + btn);
		this.bindEvent($$('#' + this.fileId));
	},
	setBtnState: function(state){
		var btn = $$('.oss-upload-btn');
		if (~[1,2].indexOf(state)) {
			btn.removeAttribute('for');
		}else{
			btn.setAttribute('for', this.fileId);
		};
		this.btnState = state;
		this.ossbtn.innerHTML = this.btnStates[state];
	},
	bindEvent: function(el) {
		var $this = this;
		el.onchange = function(e){
			var file = this.files[0]; 
			var fname = $$('.oss-upload-filename');
			if (!file) return;

			if ($this.maxSize && file.size > $this.maxSize) {
				alert('file size exceed !');
				return;
			}

			var acceptit = $this.filterFile(file);
			if (acceptit) {
				fname.innerHTML = file.name;
				if ($this.showProgress) {
	      	// $$('.oss-upload-progress').style.width = 0;
	      };
				$this.uploadFile(file);	
			}else{
				alert($this.accept + ' is expected !');
			}
		}
	},
	sliceFiles: function(file){
		var fileSize = file.size;
		var chunks = Math.ceil(fileSize / CHUNK_SIZE);
		if (fileSize > CHUNK_SIZE) {
			for(var i = 0; i < chunks; i++){
				this.slicedFiles[i] = {
					index: i,
					chunks: chunks,
					file: file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, fileSize))
				}
			}
		};
		return this.slicedFiles;
	},
	filterFile: function(file){
		if (getArgType(this.accept) !== 'array') {
			this.accept = [this.accept];
		};
		var type = (file.name.match(/\.(\w+)$/)||[])[1];
		if (~this.accept.indexOf(type) || ~this.accept.indexOf('.' + type)) {
			return 1;
		};
	},
	setFilename: function(file){
		return this.preKey + (this.keepExtensions? file.name: file.name.replace(/\.\w+$/,'') + '.' + createKey());
	},
	uploadFile: function(file) {
		var $this = this;
		this.xhr && this.xhr.abort();
		this.getSignature(function(err, res){
			if (err) {
				alert(err);
				$this.setBtnState(0);
			}else{
				$this.setBtnState(2);
				$this.xhr = new XMLHttpRequest();
				var fd = new FormData();
	   		var opt = {
	        key: $this.setFilename(file),
					OSSAccessKeyId: res.OSSAccessKeyId,
					policy: res.policy,
					signature: res.signature,
					success_action_status: 201,
					file: file
	      }
				
				if ($this.bucketParams) {
					for(var bk in $this.bucketParams){
						opt[bk] = $this.bucketParams[bk];
					}
				};
				
				for(var k in opt){
					fd.append(k, opt[k]);
				}
	      $this.xhr.upload.addEventListener("progress", function(evt) {
		      if (evt.lengthComputable) {
		        var percentComplete = Math.round(evt.loaded * 100 / evt.total);
		        var percent = percentComplete + '%';
		        $this.onProgress && $this.onProgress(percent);
		        $this._progress && $this._progress(percent);
		        var per = $$('.oss-upload-per');
		        per.style.display = 'inline-block';
		        per.innerHTML = percent;
		        if ($this.showProgress) {
		        	$$('.oss-upload-progress').style.width =  percent;
		        };
		      }
		    }, false);
	      $this.xhr.addEventListener("load", function(evt) {
	      	$this.setBtnState(3);
	      	var per = $$('.oss-upload-per');
	      	per.innerHTML = '';
	      	per.style.display = 'inline';
	      	var complete = $this.onComplete;
	      	var error = $this.onError;
	      	var res = evt.target.responseText;
	      	var postres = getXMLvalue(res, 'PostResponse');
	      	var err = getXMLvalue(res, 'Error');
	      	var mess = getXMLvalue(res, 'Message');
	      	var src = getXMLvalue(res, 'Location');
	      	if (res && postres && src) {
	      		complete && complete(src);
	      		$this._success && $this._success(src);
	      	}else if(res && err && mess){
	      		error && error(mess);
	      		$this._failed && $this._failed(mess);
	      	}else{
	      		error && error(res);
	      		$this._failed && $this._failed(mess);
	      	};
		    }, false);
		    $this.xhr.addEventListener("error", function(evt) {
		    	$this.setBtnState(3);
		    	$this.onError && $this.onError(evt);
		    	$this._failed && $this._failed(evt);
		    }, false);
	      $this.xhr.addEventListener("abort", function(evt) {
	      	$this.setBtnState(3);
	      	$this.onAbort && $this.onAbort(evt);
	      }, false);
	      $this.xhr.open('POST', $this.OSSurl, true);
	      $this.xhr.send(fd);
			};
		});
	},
	progress: function(fn){
		this._progress = fn;
		return this;
	},
	success: function(fn){
		this._success = fn;
		return this;
	},
	failed: function(fn){
		this._failed = fn;
		return this;
	},
	then: function(fn){
		return this.success.call(this, fn);
	},
	catch: function(fn){
		return this.failed.call(this, fn);
	},
	getSignature: function(fn){
		this.setBtnState(1);
		var $this = this;
		var ossConfig = localStorage.getItem('oss_config');
		var ajaxFor = false;
		if (ossConfig) {
			ossConfig = JSON.parse(decodeURIComponent(ossConfig));
			if (ossConfig.maxAge && Date.now() - ossConfig.dateNow < (ossConfig.maxAge - 1) * 60 * 1000) {
				this.resolveCallback(fn, ossConfig);
			}else{
				ajaxFor = true;
			};
		}else{
			ajaxFor = true;
		};
		if (ajaxFor) {
			$http.get(this.signatureUrl, function(res){
				if (res && res.success) {
					res.dateNow = Date.now();
					localStorage.setItem('oss_config', encodeURIComponent(JSON.stringify(res)));
				};
				$this.resolveCallback(fn, res);
			});
		};
	},
	resolveCallback: function(fn, res){
		if (res.success === undefined) {
			console.error('res.success' + ' expected !');
			return;
		};
		fn && fn.apply(this, {0: res && res.success? null: res, 1: res, length: 2});
	}
}
;

function getXMLvalue(xml, tag) {
	var reg = new RegExp('<(' + tag + ')>([\\s\\S]*)<\/\\1>', 'i');
	return (xml.match(reg) || [])[2];
}
function $$(el, all) {
	return document[all? 'querySelectorAll': 'querySelector'].call(document, el);
}

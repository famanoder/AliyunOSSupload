var $http=function(loc){
  if (loc.protocol=='file:') throw '"file://" protocol err';
    var getXHR=function(){
      return new XMLHttpRequest();
    },
    fmtPars=function(params){
      if (typeof params=='string') return params;
      var pars=[];
      for(var x in params){
        pars.push(x+'='+params[x]);
      }
      return pars.join('&');
    },
    isFunction=function(f){
      return getArgType(f)=='function';
    },
    ajax=function(sets){
      var xhr=getXHR(),
        url=sets.url||location.pathname,
        type=sets.type.toLowerCase()||'post',
        params=fmtPars(sets.params||''),
        beforeSend=sets.beforeSend||function(){},
        success=sets.success,
        failed=sets.failed,
        timeout=sets.timeout||1000*30,
        isTimed=0,
        pars=type=='get'?null:params;
        url=type=='get'?(url.indexOf('?')!=-1?(url+(params==''?'':'&'+params)):(url+(params==''?'':'?'+params))):url;

        xhr.onreadystatechange=function(){
          if (timeout>0&&xhr.readyState==1) {
            beforeSend();
            xhr.xhrTd=setTimeout(function(){
              if (xhr.readyState!=4) {
                failed&&failed('timeout');
                isTimed=1;
                xhr.abort();
                clearTimeout(xhr.xhrTd);
                throw 'timeout';
              }
            },timeout);
          }
          if (xhr.readyState==4&&!isTimed) {
            clearTimeout(xhr.xhrTd); 
            if (xhr.status==200) {
              var contType=xhr.getResponseHeader('content-type');
              if (/(javascript|json)/i.test(contType)) {
                success(new Function('','return '+xhr.responseText+'')());
              }else{
                success(xhr.responseText);
              }
            }else{
              failed&&failed(xhr);
              throw 'server err';
            }
          }
        }
        
        xhr.open(type,url,true);
        type=='post'&&xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        if ($http.headers) {
        	for(var key in $http.headers){
        		xhr.setRequestHeader(key, $http.headers[key]);
        	}
        };
        xhr.send(pars);
    },
    method=function(agrs,getSets){//url,params,suc,fail,timeout
      if (isFunction(agrs[1])) {
        getSets.success=agrs[1];
        if (isFunction(agrs[2])) {
          getSets.failed=agrs[2];
          if (agrs[3]&&agrs[3]>0) {
            getSets.timeout=agrs[3];
          }
        }else if(agrs[2]>0){
          getSets.timeout=agrs[2];
        }
      }else if(isFunction(agrs[2])){
        getSets.params=agrs[1];
        getSets.success=agrs[2];
        if (agrs[3]) {
          if (isFunction(agrs[3])) {
            getSets.failed=agrs[3];
            if (agrs[4]&&agrs[4]>0) {
              getSets.timeout=agrs[4];
            }
          }else if(agrs[3]>0){
            getSets.timeout=agrs[3];
          }
        }
      }
      ajax(getSets);
    },
    get=function(){
      method(arguments,{
        url:arguments[0],
        type:'get'
      });
    },
    post=function() {
      method(arguments,{
        url:arguments[0],
        type:'post'
      });
    },
    put=function() {
      method(arguments,{
        url:arguments[0],
        type:'put'
      });
    },
    getJson=function(url,cb){
      var funId='famanoder'+new Date().getTime();
      window[funId]=function(data){
        cb(data);
        document.body.removeChild(document.getElementById(funId));
        delete window[funId];
      }
      var script=document.createElement('script');
      script.id=funId;
      script.src=url.indexOf('?')!=-1?url+'&jsonpCallback='+funId:url+'?jsonpCallback='+funId;
      document.body.appendChild(script);
    };
    return {
      get:get,
      post:post,
      put:put,
      getJson:getJson
    }
}(location);
function getArgType(arg){
  return Object.prototype.toString.call(arg).match(/\s(\w+)/)[1].toLowerCase();
}
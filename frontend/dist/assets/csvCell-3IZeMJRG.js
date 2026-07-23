const r=/^[=+\-@]/;function c(e){let t=String(e??"");return r.test(t)&&(t="'"+t),`"${t.replace(/"/g,'""')}"`}export{c};

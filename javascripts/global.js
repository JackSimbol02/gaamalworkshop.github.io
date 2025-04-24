/// <reference path="jquery-2.1.0.js" />
/// <reference path="bootstrap.js" />
/*
 * Botzone 2.0 全局控制脚本
 * 作者：zhouhy
 * 需求：jQuery、jquery.i18n.properties、jquery.cookie、bootstrap、GreenSocks
 * 说明：全站的表单都依赖于此脚本
 *
 * 包含功能：
 *
 * 日期简化；
 * 国际化模块；
 * 浏览器检查；
 * 表单验证框架；
 * 注册登录账户修改的表单逻辑；
 * 查看公开的Bot代码；
 * 私信消息系统；
 * 广播和通知系统；
 * 自动完成下拉框；
 * 可选中表格；
 * 页面导航转ajax（实验性功能）；
 * 账户链接弹框；
 * 经验值变动弹框；
 * 优化淡入淡出效果；
 * 全站新用户指引；
 * Bootstrap 多重模态框修正
 *
 * 已知Bug：Ajax页面导航中，页面HTML里的直接JS代码如果放在带document.ready的js下面，那么就会晚于document.ready运行，因为页面已经是ready状态，所以会按顺序执行……
 */

// 万物之源
export var Botzone = {
	loggedIn: false,
	tutorialDismissed: false,
	consts: {},
	gio: undefined,
	emulated_gio: undefined,
	io: io,
	io_bak: io,
	id2group: {},
	id2game: {},
	id2misc: {},
	rootTimeline: undefined
};

// 覆盖系统的日期表示函数
Date.prototype.toString = function () {
	var min = this.getMinutes(), sec = this.getSeconds();
	if (min < 10)
		min = "0" + min;
	if (sec < 10)
		sec = "0" + sec;
	return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate() + " " + this.getHours() + ":" + min + ":" + sec;
};

// 增加“最多保留d位小数”功能
Number.prototype.toFixedIfFloat = function (d) {
	if (parseInt(this) == this)
		return this;
	else
		return this.toFixed(d);
};

var __constNode = document.createElement('p');
/**
 * 将字符串中的危险字符进行转义
 * @param hostile 危险的字符串
 */
export function neutralize(hostile) {
	__constNode.textContent = hostile;
	return __constNode.innerHTML;
}

// 初始化国际化模块
//if (!$.cookie("locale")) {
//	$.cookie("locale", "cn");
//	window.location.reload();
//}

$.i18n.properties({
	name: 'Global',
	path: '/locales/',
	mode: 'map',
	language: $.cookie("locale") || "cn"
});
export var __ = function () { return $.i18n.prop.apply($.i18n, arguments); };

// 浏览器检查模块（来自：http://stackoverflow.com/questions/13478303/correct-way-to-use-modernizr-to-detect-ie）
var BrowserDetect = {
	init: function () {
		this.browser = this.searchString(this.dataBrowser) || "Other";
		this.version = this.searchVersion(navigator.userAgent) || this.searchVersion(navigator.appVersion) || "Unknown";
	},
	searchString: function (data) {
		for (var i = 0; i < data.length; i++) {
			var dataString = data[i].string;
			this.versionSearchString = data[i].subString;

			if (dataString.indexOf(data[i].subString) !== -1) {
				return data[i].identity;
			}
		}
	},
	searchVersion: function (dataString) {
		var index = dataString.indexOf(this.versionSearchString);
		if (index === -1) {
			return;
		}

		var rv = dataString.indexOf("rv:");
		if (this.versionSearchString === "Trident" && rv !== -1) {
			return parseFloat(dataString.substring(rv + 3));
		} else {
			return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
		}
	},

	dataBrowser: [
		{ string: navigator.userAgent, subString: "Chrome", identity: "Chrome" },
		{ string: navigator.userAgent, subString: "MSIE", identity: "Explorer" },
		{ string: navigator.userAgent, subString: "Trident", identity: "Explorer" },
		{ string: navigator.userAgent, subString: "Firefox", identity: "Firefox" },
		{ string: navigator.userAgent, subString: "Safari", identity: "Safari" },
		{ string: navigator.userAgent, subString: "Opera", identity: "Opera" }
	]

};

BrowserDetect.init();
if (BrowserDetect.browser == "Explorer") {
	if (!confirm(__("fuckyouie")))
		window.location.href = '/unsupported';
}

// 重写 jQuery 的 FadeIn 和 FadeOut，并增加一个 Highlight

jQuery.fn.fadeIn = function (delay, cb) {
	if (isNaN(delay)) {
		cb = delay;
		delay = 500;
	}
	if (this.css("display") == "")
		this.css({ display: "", opacity: 0 });
	else {
		if (this.css("display") == "none")
			this.css({ display: "", opacity: 0 });
		if (this.css("display") == "none")
			this.css({ display: "block", opacity: 0 });
	}
	TweenMax.to(this, delay / 1000, { opacity: 1, onComplete: cb && cb.bind(this) });
	return this;
};

jQuery.fn.fadeOut = function (delay, cb) {
	if (isNaN(delay)) {
		cb = delay;
		delay = 500;
	}
	var that = this;
	TweenMax.to(this, delay / 1000, {
		opacity: 0, onComplete: function () {
			that.css("display", "none");
			if (typeof cb == "function")
				cb.call(that);
		}
	});
	return this;
};

jQuery.fn.highlight = function (delay) {
	if (isNaN(delay))
		delay = 500;
	TweenMax.fromTo(this, delay / 1000, {
		backgroundColor: "#FFFFB1"
	}, {
		backgroundColor: "#FFFFFF",
		ease: Linear.easeNone,
		clearProps: "background-color"
	});
	return this;
};

// 通用表单验证

export var validateFunctions = { dummy: function () { }, nonNull: function (val) {
		 if (!val || val.length == 0)
			 return __("notnull");
		 return null;
	 }
};
var _dbg_novalidation = false;

export function FormConfig(argu) { // 是构造函数
	for (var i in argu)
		this[i] = argu[i];
}

export function ValidateCtrl(ctrl, validateFunc) {
	if (!(ctrl instanceof jQuery))
		ctrl = $(ctrl);
	var result = validateFunc(ctrl.val());
	//if (!result && /蛤/.exec(ctrl.val()))
	//	result = "暴力膜蛤不可取";
	if (result) {
		if (ctrl.prop("type") != "hidden")
			$(ctrl.tooltip("enable").attr("data-original-title", result).parent()).removeClass("has-success").addClass("has-error");
		return false;
	} else {
		if (ctrl.prop("type") != "hidden")
			$(ctrl.tooltip("disable").parent()).removeClass("has-error").addClass("has-success");
		return true;
	}
}

/**
 * 检查表单并提交
 * @param {*} form 表单的DOM或jQuery
 * @param {FormConfig} config 表单配置
 * @returns 仅在需要用 iframe 提交（带文件）时返回 true
 */
export function ValidateAndSubmit(form, config) {
	if (!(form instanceof jQuery))
		form = $(form);
	var result = true, data = new Object();
	if (!config.setFormResponse)
		config.setFormResponse = function (message, isFailed) {
			if (isFailed)
				form.find(".alert").slideDown().text(message).removeClass("alert-success alert-warning alert-info").addClass("alert-danger").css({ whiteSpace: "pre" });
			else
				form.find(".alert").slideDown().text(message).removeClass("alert-danger alert-warning alert-info").addClass("alert-success").css({ whiteSpace: "normal" });
		};
	if (!config.setFieldError)
		config.setFieldError = function (selector, message) {
			if (message)
				$(form.find(selector).highlight(1000).tooltip("enable").attr("data-original-title", message).tooltip("show").parent())
					.removeClass("has-success").addClass("has-error");
			else
				$(form.find(selector).tooltip("disable").parent()).removeClass("has-error").addClass("has-success");
		};
	form.find("[data-validatefunc]").each(function (i, ele) {
		ele = $(ele);
		if (_dbg_novalidation || ValidateCtrl(ele, validateFunctions[ele.data("validatefunc")])) {
			ele.tooltip("hide");
			var name = ele.prop("name");
			var thisVal;
			if (ele.prop("type") == "checkbox") {
				ele.val("true");
				if (name && name.length > 0)
					thisVal = ele[0].checked;
			} else if (ele.prop("type") == "radio") {
				if (name && name.length > 0 && ele[0].checked)
					thisVal = ele.val();
			} else if (name && name.length > 0)
				thisVal = ele.val();
			if (thisVal) {
				if (!data[name])
					data[name] = thisVal;
				else if (Array.isArray(data[name]))
					data[name].push(thisVal);
				else
					data[name] = [data[name], thisVal];
			}
		} else {
			ele.tooltip("show").highlight(1000);
			result = false;
		}
	});
	if (result && typeof config.finalValidate == "function") {
		result = config.finalValidate(form);
	}
	if (result || _dbg_novalidation) {
		if (config.externalSubmitMethod && config.externalSubmitMethod(form, data))
			return false;
		Botzone.ldscreen.fadeIn();
		TweenMax.to(window, 0.3, { scrollTo: { y: form.offset().top - 200 } });
		TweenMax.to($(".modal.in"), 0.3, { scrollTo: { y: 0 } });
		if (config.ajaxFile) {
			$("#submitTarget").one("load", function () {
				var data;
				try {
					data = this.contentWindow.document.body.innerText;
					data = JSON.parse(/{.*}/.exec(data)[0]);
					Botzone.ldscreen.stop().fadeOut();
					config.onResult(data);
				} catch (ex) {
                    console.log("IFrame submission error: " + ex);
					Botzone.ldscreen.stop().fadeOut();
					try {
						config.onError(null, null, data.match(/\<title\>([^\>]*)\<\/title\>/)[1]);
					} catch (ex) {
                        console.log("IFrame submission last resort error: " + ex);
						config.onError(null, null, data);
					}
				}
			});
			form.prop("target", "submitTarget").prop("method", config.method)
				.prop("action", config.action).prop("enctype", "multipart/form-data");
			return true;
		} else {
			$[config.method](config.action, data, function (recvData) {
				Botzone.ldscreen.stop().fadeOut();
				config.onResult(recvData);
			}, "json").fail(function (jqXHR, textStatus, errorThrown) {
				Botzone.ldscreen.stop().fadeOut();
				config.onError(jqXHR, textStatus, errorThrown || __(jqXHR.status));
			});
			return false;
		}
	} else
		return false;
}

//// 登录表单逻辑 - 始

export var confLoginForm = new FormConfig({
	method: "post",
	action: "/login",
	finalValidate: null,
	onResult: function (result) {
		this.setFieldError("input");
		if (result.success == false) {
			if (result.message == __("user.wrongpwd"))
				this.setFieldError("input[name=password]", result.message);
			else if (result.message == __("user.nouser"))
				this.setFieldError("input[name=email]", result.message);
		} else {
		Botzone.ldscreen.stop().fadeIn();
			var target = window.location.href.replace(/([^?]+)?msg=.+$/, "$1");
			if (target == window.location.href)
				window.location.reload();
			else
				window.location.href = target;
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFieldError("input", true);
	}
});

//// 登录表单逻辑 - 终

//// 注册表单逻辑 - 始

export var confRegisterForm = new FormConfig({
	method: "post",
	action: "/signup",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
			ReloadCaptcha();
		} else {
			this.setFormResponse(__("signup.success"), false);
			setTimeout(function () {
				$('#dlgModal').modal('hide');
			}, 5000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
		ReloadCaptcha();
	}
});

validateFunctions.checkNick = function (nick) {
	if (nick == "" || nick == null)
		return __("nick.nonnull");
	else if (/[0-9]+/.test(nick.substr(0, 1)))
		return __("nick.numprecede");
	else if (nick.length < Botzone.consts.user.name_length_min)
		return __("nick.tooshort");
	else if (nick.length > Botzone.consts.user.name_length_max)
		return __("nick.toolong");
	else if (!/^[_A-Za-z0-9\u4e00-\u9fa5]+$/.test(nick))
		return __("nick.invalidchar");
	return null;
};

validateFunctions.checkPwd = function (pwd) {
	if (pwd == "" || pwd == null)
		return __("pwd.nonnull");
	else if (pwd.length < Botzone.consts.user.password_length_min)
		return __("pwd.tooshort");
	else if (pwd.length > Botzone.consts.user.password_length_max)
		return __("pwd.toolong");
	return null;
};

validateFunctions.checkPwdRep = function (pwdconfirm) {
	var pwd = $("#txtPassword_reg").val();
	if (pwd == "" || pwd == null)
		return __("pwd.confirm.pwdnonnull");
	else if (pwdconfirm == "" || pwdconfirm == null)
		return __("pwd.confirm.nonnull");
	else if (pwd != pwdconfirm)
		return __("pwd.confirm.notmatch");
	return null;
};

validateFunctions.checkEmail = function (email) {
	if (email == "" || email == null)
		return __("email.nonnull");
	else if (!/[-._A-Za-z0-9]+@[-._A-Za-z0-9]+$/.test(email))
		return __("email.invalid");
	return null;
};

validateFunctions.checkCaptcha = function (captcha) {
	if (captcha == "" || captcha == null)
		return __("captcha.nonnull");
	if (captcha.length != 4)
		return __("captcha.wronglength");
	else if (!/[_A-Za-z0-9]+$/.test(captcha))
		return __("captcha.wrongchar");
	return null;
};

// 密码强度检查
export function UpdatePwdRate(pwd) {
	var rate = 0;
	if (/[a-z]+/.test(pwd))
		rate += 1;
	if (/[A-Z]+/.test(pwd))
		rate += 2;
	if (/[0-9]+/.test(pwd))
		rate += 1;
	if (/[^a-zA-Z0-9]+/.test(pwd))
		rate += 3;
	if (pwd.length > 10)
		rate += 2;
	rate = rate > 6 ? 1 : (rate / 6);
	if (rate < 0.33)
		$(".pwd-rate-text").html(__("pwd.weak"));
	else if (rate < 0.67)
		$(".pwd-rate-text").html(__("pwd.med"));
	else
		$(".pwd-rate-text").html(__("pwd.strong"));
	TweenMax.to(".pwd-rate-fill", 0.1, {
		x: (rate - 1) * 100 + "%",
		backgroundColor: "rgb(" + parseInt((1 - rate) * 255) + "," + parseInt(rate * 127 + 63) + ",0)"
	});
}

export function ReloadCaptcha() {
	$("#imgCaptcha").prop("src", "/captcha?" + Math.random());
}

//// 注册表单逻辑 - 终

//// 账户修改逻辑 - 始

validateFunctions.checkPwdRep_modify = function (pwdconfirm) {
	var pwd = $("#txtPassword_modify").val();
	if (pwd == "" || pwd == null)
		return __("pwd.confirm.pwdnonnull");
	else if (pwdconfirm == "" || pwdconfirm == null)
		return __("pwd.confirm.nonnull");
	else if (pwd != pwdconfirm)
		return __("pwd.confirm.notmatch");
	return null;
};

export var confModifyPwd = new FormConfig({
	method: "post",
	action: "/config/changepwd",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () {
				$('#dlgAccountConfig').modal('hide');
			}, 5000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

export var confModifyName = new FormConfig({
	method: "post",
	action: "/config/changenick",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () {
				window.location.reload();
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

export var confModifyAvatar = new FormConfig({
	method: "post",
	ajaxFile: true,
	action: "/config/changeavatar",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () {
				window.location.reload();
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 账户修改逻辑 - 终

//// 私信发送逻辑 - 始

export var confSendMsg = new FormConfig({
	method: "post",
	action: "/notification/send",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				$('#dlgSendMsg').modal('hide');
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkMsgContent = function (content) {
	if (content == "" || content == null)
		return __("content.nonnull");
	else if (content.length > Botzone.consts.notification.content_length_max)
		return __("content.toolong");
	return null;
};

//// 私信发送逻辑 - 终

//// 本地AI修改逻辑 - 始

validateFunctions.checkLocalAISecret = function (secret) {
	if (secret == "" || secret == null)
		return __("secret.nonnull");
	else if (secret.length > Botzone.consts.user.secret_length_max)
		return __("secret.toolong");
	var target = $("#aConnectURL_localai");
	var parts = target.prop("href").split('/');
	parts[parts.length - 2] = secret;
	var final = parts.join('/');
	target.prop("href", final);
	$("#txtConnectURL_localai").val(final);
	return null;
};

export var confLocalAIConfig = new FormConfig({
	method: "post",
	action: "/config/changelocalaisecret",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				$('#dlgLocalAIConfig').modal('hide');
			}, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 本地AI修改逻辑 - 终

// 查看公开的Bot源码
function _gViewBotSrc(botid, botname, botver) {
	$("#dlgViewSource h4").html(__("viewsource", botname, botver));
	var codebox = $("#dlgViewSource pre").text(__("loading"));
	var downloadlink = $("#dlgViewSource .download");
	$.get("/mybots/viewsrc/" + botid + "/" + botver, null, function (data) {
		if (data.binary) {
			codebox.hide();
			downloadlink.show()
				.prop("href", "/mybots/viewsrc/" + botid + "/" + botver + "?download=true");
			return;
		}
		downloadlink.hide();
		// 启用代码高亮
		codebox.show().replaceWith($("<pre class=\"prettyprint\"></pre>").text(data.message));
		prettyPrint();
	}, "json");
}

// 广播消息
export function BroadcastMessage() {
	var content = prompt(__("msg.broadcast"));
	if (content === null || content === false)
		return;
	Botzone.$post("/broadcast", { content: content }, function (result) {
		Botzone.alert(__("msg.broadcast.success"));
	});
}

// 清空通知
export function MsgClearAll() {
	if (!confirm(__("msg.clear.confirm")))
		return;
	Botzone.$post("/notification/clear", null, function (result) {});
}

/*
 * 修正AceEditor的包含路径问题
 */
export function AceEditorRequirePathFix() {
	if (typeof ace != 'undefined')
		ace.config.set('basePath', '/aceeditor');
}

export function ToggleTheme() {
	var state = $.cookie("pku-theme");
	if (state && state == "true")
		$.cookie("pku-theme", "false", { path: '/' });
	else
		$.cookie("pku-theme", "true", { path: '/' });
	window.location.reload();
}

/*
 * @description 读取私信
 * @param id 私信在通知中的编号
 */
export function ReadMsg(id) {
	var curr = _notifications[id];
	$("#dIncomingMsg").show().find("pre.form-control-static").text(curr.content);
	$("#txtNick_sendmsg").val(curr.sender.name);
	$("#iTargetID_sendmsg").val(curr.sender._id);
	$("#dlgSendMsg").modal('show');
}

export function SendPasswordResetEmail() {
	$("#txtLoginPassword").val("*******");
	ValidateAndSubmit($("#frmLogin"), new FormConfig({
		method: "get",
		action: "/resetpwd",
		finalValidate: function () {
			$('#panForgetPassword a').prop("href", "/resetpwd?email=" + $("#txtLoginEmail").val());
			return false;
		}
	}));
}

// 增加CSS3播放函数
$.fn.playAnimation = function (animClass, time, cb) {
	this.removeClass(animClass);

	// 强制重排，使动画重启
	void this[0].offsetWidth;
	this.addClass(animClass);
	if (typeof time == "function")
		cb = time;
	if (isNaN(time))
		time = parseFloat(this.css("animationDuration")) * 1000;
	if (typeof cb == "function") {
		var that = this;
		setTimeout(function () {
			cb.call(that);
		}, time);
	}
	return this;
};

var dUserPopup, dTablePopup, aExportCSV, aSendMsg, aViewHome, pUserName, _notifications, timExpChange, dUserExp,
	_gReplacePage = function (target) { window.location.href = target; };
var lastBroadcast;

var tutorialCurrent = -1, tutorialTotal = 5, $tutorial, inAnimation;
// 设置网站引导页的进度
export function SetTutorial(reset) {
	if (inAnimation)
		return;
	inAnimation = true;
	var tl = new TimelineMax(), $phases = $tutorial.find("figure.phase");
	tutorialTotal = $phases.length;
	if (reset === true) {
		$("#dNavbar").addClass("in-tutorial");
		$phases.css("display", "none");
		tl.set($tutorial, { display: "", rotation: "0", x: "0%", y: "0%" });
		tl.fromTo($tutorial, 0.3, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, ease: Cubic.easeOut });
		tutorialCurrent = -1;
	}
	tutorialCurrent++;
	if (tutorialCurrent > 0) {
		tl.set($phases.eq(tutorialCurrent - 1).data("focusitem"), { className: "-=tutorial-focus" });
		tl.to($phases[tutorialCurrent - 1], 0.3, { rotationX: 90 });
		tl.set($phases[tutorialCurrent - 1], { display: "none" });
	}
	if (tutorialCurrent == tutorialTotal || reset === false) {
		tl.to($tutorial, 1, { opacity: 0, x: "50%", y: "50%", scale: 0, ease: Cubic.easeIn });
		tl.set($tutorial, { display: "none" });
		tl.call(function () {
			if (!Botzone.tutorialDismissed)
				$.post("/dismisstutorial");
			inAnimation = false;
		});
		$("#dNavbar").removeClass("in-tutorial");
		return;
	}
	tl.set($phases[tutorialCurrent], { display: "" });
	tl.fromTo($phases[tutorialCurrent], 0.3, { rotationX: -90 }, { rotationX: 0 });
	tl.set($phases.eq(tutorialCurrent).data("focusitem"), { className: "+=tutorial-focus" });
	tl.call(function () {
		inAnimation = false;
	});
	$tutorial.find("span.tutorial-progress").text((tutorialCurrent + 1) + " / " + tutorialTotal);
}

// 给 Socket.io 展示连接状态
export function DisplaySocketStatus(socket, $element, connectHtml, fnConnect) {
	var preset = {
		'connect': '',
		'connect_error': '<span class="glyphicon glyphicon-remove-circle"></span>',
		'connect_timeout': '<span class="glyphicon glyphicon-remove-circle"></span>',
		'disconnect': '<span class="glyphicon glyphicon-remove-circle"></span>',
		'reconnect': '<span class="glyphicon glyphicon-ok-circle"></span>',
		'reconnecting': '<img src="/images/connecting.gif" />',
		'reconnect_error': '<span class="glyphicon glyphicon-remove-circle"></span>',
		'reconnect_failed': '<span class="glyphicon glyphicon-remove-circle"></span>'
	};
	for (var event in preset)
		(function (event) {
			socket.removeAllListeners(event);
			if (event == 'connect') // 不知为何，有时候这个事件会被连续触发
				socket.once(event, function (arg) {
					if (event == 'connect')
						$element.html(connectHtml), fnConnect();
				});
			else
				socket.on(event, function (arg) {
					$element.html(preset[event] + '<span>' + __("io." + event, JSON.stringify(arg)) + '</span>');
					if (event == 'reconnect')
						fnConnect();
				});
		})(event);
}

// 蜜汁特效
export function Shake() {
	var $body = $("body");
	var tl = new TimelineMax();
	for (var i = 0; i < 5; i++) {
		var amplitude = 11 - i * 2;
		tl.to($body, 0.05, {
			x: Math.random() * amplitude * 2 - amplitude,
			y: Math.random() * amplitude * 2 - amplitude,
			yoyo: true,
			ease: SteppedEase.config(3)
		});
	}
	tl.to($body, 0.1, { x: 0, y: 0 });
}

export function SelectText(selector) {
	var s = window.getSelection();
	var r = document.createRange();
	r.selectNodeContents($(selector)[0]);
	s.removeAllRanges();
	s.addRange(r);
	if (document.execCommand('copy'))
		Botzone.alert(__("copy.success.general"));
}

// 更新收藏夹
var mnuFavorite, sFavCount, btnFavorite, lastFavorites = {};
export function UpdateFavorites(result) {
	if (!result.success)
		return alert(__("favorite.errorload") + "\n" + result.message);
	
	var typedef = { "bot": "favorited_bots", "match": "favorited_matches" };
	for (var type in typedef) {
		var mnu = mnuFavorite[type];
		var field = typedef[type];
		var data = result[field] = lastFavorites[field] = result[field] || lastFavorites[field];
		mnu.find(".favorite-item:not(.template)").remove();
		if (data.length == 0)
			mnu.find(".prompt").show();
		else {
			var template = mnu.find(".favorite-item.template");
			for (var i = 0; i < data.length; i++) {
				var curr = data[i],
					item = template.clone();
				item.find("[data-path]").each(function () {
					var parentObj = curr, pathComponents = $(this).data("path").split(/\./g);
					for (var j = 0; j < pathComponents.length; j++)
						parentObj = parentObj[pathComponents[j]];
					this.textContent = parentObj;
				});
				item.find("[data-toggle=tooltip]").tooltip({ container: 'body' });
				if (type == "bot") {
					for (var j = 0; j < _allGames.length; j++)
						if (curr.bot.game == _allGames[j]._id)
							item.tooltip({ title: __("favorite.game", _allGames[j].name), container: "body", placement: "left" });
				}
				item.find("[data-role]").each(function () {
					var $this = $(this);
					switch ($this.data("role")) {
						case "avatar":
							this.src = "/avatar/" + curr.user._id + ".png";
							break;
						case "user":
							this.href = "/account/" + curr.user._id;
							break;
						case "create_time":
							this.textContent = new Date(curr.create_time);
							break;
						case "game":
							this.href = "/game/" + curr.game.name;
							break;
						case "players":
							var html = "";
							for (var i = 0; i < curr.players.length; i++)
								if (curr.players[i].type == "bot") {
									var b = curr.players[i].bot;
									html += '<div class="compact-player">' + Botzone.buildingBlocks.avatar(b.user._id) +
										'<div class="playername">' + Botzone.buildingBlocks.username(b.user) +
										'<span>' + b.bot.name + "</span></div>";
									if (curr.scores.length > 0) 
										html += '<span class="score">' + curr.scores[i].toFixedIfFloat(2) + "</span>";
									html += "</div>";
								} else {
									var u = curr.players[i].user;
									html += '<div class="compact-player">' + Botzone.buildingBlocks.avatar(u._id) +
										'<div class="playername">' + Botzone.buildingBlocks.username(u) + "</div>";
									if (curr.scores.length > 0) 
										html += '<span class="score">' + curr.scores[i].toFixedIfFloat(2) + "</span>";
									html += "</div>";
								}
							$this.html(html);
							break;
						case "score":
							this.textContent = __("mybots.rankscore", curr.bot.score.toFixed(2));
							break;
						case "ranklist":
							this.href = "/game/ranklist/" + curr.bot.game + "/" + curr.bot._id;
							break;
						case "replay":
							this.href = "/match/" + curr._id;
							break;
						case "copyid":
							$this.data("id", curr._id).click(function () {
								Botzone.copy($this.data("id"), __("copy.success"), __("copy.prompt"));
							});
							break;
						case "remove":
							$this.data("id", curr._id).data("type", type).click(function () {
								if (!confirm(__("favorite.remove")))
									return;
								if ($this.data("type") == "bot")
									$.post("/favorite/bot/remove", { botversionid: $this.data("id") }, UpdateFavorites);
								else
									$.post("/favorite/match/remove", { matchid: $this.data("id") }, UpdateFavorites);
							});
							break;
					}
				});
				mnu.prepend(item.removeClass("template").show());
				mnu.find(".prompt").hide();
			}
		}
	}
	var total = result.favorited_bots.length + result.favorited_matches.length;
	if (total) {
		sFavCount.text(total).show();
		btnFavorite.addClass("msgbtn").highlight(1000);
	} else {
		sFavCount.hide();
		btnFavorite.removeClass("msgbtn");
	}
}

export function AddFavoriteBot(ctrl, botid, ver) {
	$.post("/favorite/bot/add", { botid: botid, ver: ver }, UpdateFavorites);
	Botzone.trailFocus($(ctrl), btnFavorite);
}

export function AddFavoriteMatch(ctrl, matchid) {
	$.post("/favorite/match/add", { matchid: matchid }, UpdateFavorites);
	Botzone.trailFocus($(ctrl), btnFavorite);
}

/**
 * 使用data-submitform和data-submitconf标记的提交按钮和表单双向链接
 * 同时保护无辜的按钮不被波及
 */
export function ConnectFormSubmits() {
	// 我真的……很讨厌button的type居然默认是submit的这个“标准”
	// 所以，我决定改造这个世界
	$("button:not([type]):not([data-submitform])").each(function () {
		var $this = $(this);
		$this.attr("type", "button");
	});
	$("[data-submitform]").off("click").each(function () {
		var $this = $(this);
		var $form = $($this.data("submitform"));
		var conf = window[$this.data("submitconf")];
		if ($form.length == 0 || !conf)
			return;
		$form.prop("onsubmit", null).off("submit").on("submit", function () {
			return ValidateAndSubmit($form, conf);
		});
		// 防止由于这个按钮就在这个表单里，回车的时候相当于先按下按钮，导致重复提交
		if ($form.find("button[data-submitform]").length == 0)
			$this.on("click", function () {
				$form.submit();
			});
		else
			$this.attr("type", "submit");
	});
}

function FixCookies() {
	// 清空历史遗留的存储在当前路径的Cookie
	var oldCookies = $.cookie();
	var currPathDir = location.pathname.split('/');
	currPathDir.pop();
	currPathDir = currPathDir.join('/');
	if (currPathDir != '') {
		var cookieNames = Object.keys(oldCookies);
		for (var i = 0; i < cookieNames.length; i++) {
			var c = cookieNames[i];
			$.removeCookie(c, { path: currPathDir });
		}
	}
}

// 初始化
$(document).ready(function () {
	FixCookies();
	//$(".qrcode-icon").tooltip({ container: 'body', html: true });

	ConnectFormSubmits();

	// Bootstrap 多重模态框修正
	$(document).on('show.bs.modal', '.modal', function () {
		var zIndex = 1040 + (10 * $('.modal:visible').length);
		$(this).css('z-index', zIndex);
		setTimeout(function () {
			$('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
		}, 0);
	});
	$(document).on('hidden.bs.modal', '.modal', function () {
		$('.modal:visible').length && $(document.body).addClass('modal-open');
	});

	var dlgBroadcast = $("#dlgBroadcast");
	dUserPopup = $("#dUserPopup");
	dTablePopup = $("#dTablePopup");
	aExportCSV = $("#aExportCSV");
	pUserName = dUserPopup.find("p:eq(0)");
	aSendMsg = dUserPopup.find("a:eq(0)");
	aViewHome = dUserPopup.find("a:eq(1)");
	dUserExp = $("#dUserExp");
	$tutorial = $("#tutorial, .tutorial-mouse-mask");

	// 调试：按住 F7 提交不验证表单
	$(document).keydown(function (e) {
		if (e.keyCode == 118/* F7 */) {
			$("[data-submitform]").css("boxShadow", "black 0 0 10px");
			_dbg_novalidation = true;
		}
		if (e.keyCode == 115/* F4 */)
			Shake();
		if ((e.keyCode == 116/* F5 */ ||
			(e.keyCode == 82/* R */ && e.ctrlKey)) && Botzone.__refreshAction) {
			e.preventDefault();
			Botzone.__refreshAction();
			return false;
		}
	});
	$(document).keyup(function (e) {
		if (e.keyCode == 118) {
			$("[data-submitform]").css("boxShadow", "");
			_dbg_novalidation = false;
		}
	});

	//// 密码框获得焦点时显示找回密码按钮
	//$("#txtLoginPassword").popover({
	//	html: true,
	//	content: '<a class="btn btn-danger" onclick="SendPasswordResetEmail()">' + __("password.reset") + '</a>',
	//	trigger: 'manual'
	//}).focus(function () {
	//	$(this).popover('show');
	//}).blur(function () {
	//	$(this).popover('hide');
	//});

	// 展开列表
	var userOptionsHtml = "";
	for (var i = 0; i < _allUsers.length; i++) {
		userOptionsHtml += '<option value="' + _allUsers[i]._id + '">' + neutralize(_allUsers[i].name) + '</option>';
		_allUsers[i].type = "user";
		_allUsers[i].id = "user-" + _allUsers[i]._id;
	}
	var groupOptionsHtml = "";
	for (var i = 0; i < _allGroups.length; i++) {
		groupOptionsHtml += '<option value="' + _allGroups[i]._id + '">' + neutralize(_allGroups[i].name) + '</option>';
		_allGroups[i].type = "group";
		_allGroups[i].id = "group-" + _allGroups[i]._id;
		Botzone.id2group[_allGroups[i]._id] = _allGroups[i].name;
	}
	var gameOptionsHtml = "";
	for (var i = 0; i < _allGames.length; i++) {
		gameOptionsHtml += '<option value="' + _allGames[i]._id + '">' + neutralize(_allGames[i].name) + '</option>';
		_allGames[i].type = "game";
		_allGames[i].id = "game-" + _allGames[i]._id;
		Botzone.id2game[_allGames[i]._id] = _allGames[i].name;
	}
	for (var i = 0; i < _allTags.length; i++) {
		_allTags[i].type = "misc";
		_allTags[i].id = "misc-" + _allTags[i]._id;
		Botzone.id2misc[_allTags[i]._id] = _allTags[i].name;
	}

	// 填充用户、小组、游戏列表
	function inflateLists() {
		$(".inflate-users").append(userOptionsHtml);
		$(".inflate-groups").append(groupOptionsHtml);
		$(".inflate-games").append(gameOptionsHtml);
	}
	inflateLists();

	// 自动表单验证
	$(document).on("blur", "[data-validatefunc]", function () {
		var me = $(this);
		me.tooltip({ placement: "auto top" });
		ValidateCtrl(me, validateFunctions[me.data("validatefunc")]);
	})
	// 限制数字输入
	.on("keypress", ".numeric", function (event) {
		if ((event.keyCode || event.which) < 48 || (event.keyCode || event.which) > 57)
			return false;
	});

	// 可选中表格
	function InitializeExpandableTable() {
		var currSelected = null;
		$("table.expandable tr").each(function () {
			var curr = $(this);
			curr.click(function () {
				if (curr.hasClass("selected")) {
					curr.removeClass("selected");
					currSelected = null;
				} else {
					curr.addClass("selected");
					if (currSelected)
						currSelected.removeClass("selected");
					currSelected = curr;
				}
			});
		});
	}

	InitializeExpandableTable();

	// 通知
	var broadCast = $("#dNewBroadcastMessage").click(function () {
		var future = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
		$.cookie("dismissBroadcast", $(this).hide().data("id"), { expires: future, path: '/' });
	});
	if ($.cookie("dismissBroadcast") == broadCast.data("id"))
		broadCast.click();

	// 弹出框点击页面关闭
	Botzone.__popoverToggles = $('.popover-toggle');
	var mouseClickedInMsgDropdown = false, mouseClickedInFavoriteDropdown = false;
	var btnMsg = $("#btnMsg"), dMsgInnerMenu = $("#mnuMsg");
	mnuFavorite = { bot: $("#mnuFavoriteBots"), match: $("#mnuFavoriteMatches"), self: $("#mnuFavorite") };
	sFavCount = $("#sFavCount");
	btnFavorite = $("#btnFavorite");
	$('body').on('click', function (e) {
		var $popovers = $('.popover');
		Botzone.__popoverToggles.each(function () {
			var $this = $(this);
			if (!$this.is(e.target) &&
				$this.has(e.target).length === 0 &&
				$popovers.has(e.target).length === 0) {
				var p = $this.data('bs.popover');
				if (p && p.tip().hasClass('in')) {
					$this.click();
					//$popovers.each(function (i, ele) {
					//	var curr = $(ele);
					//	if (!curr.hasClass("in"))
					//		curr.remove();
					//});
				}
			}
		});

		// 消息框（实际为dropdown）点击页面关闭
		mouseClickedInMsgDropdown = dMsgInnerMenu.has(e.target).length > 0;
		mouseClickedInFavoriteDropdown = mnuFavorite.self.has(e.target).length > 0;
	});

	btnMsg.parent().on("hide.bs.dropdown", function (event) {
		return !mouseClickedInMsgDropdown;
	});
	btnFavorite.parent().on("hide.bs.dropdown", function (event) {
		return !mouseClickedInFavoriteDropdown;
	});

	var reloadNotification = function () { };

	// 初始化无刷新加载功能 - Experimental
	if (typeof window.history.pushState == "function") {
		window.history.replaceState({ href: window.location.href }, document.title);
		window.onpopstate = function (event) {
			if (!isExternal(window.location.href)) {
				if (Botzone.__entryHref &&
					window.location.href.split('#')[0] == Botzone.__entryHref.split('#')[0]) { // 只改了 Hash？
					window.history.replaceState({ href: window.location.href }, document.title);
					if (Botzone.__hashChangedAction)
						Botzone.__hashChangedAction(window.location.hash);
				} else if (event.state) // 那……之前这个页面也是 Ajaxload 进来的？
					replacePage(event.state.href, true);
				else {
					window.history.replaceState({ href: window.location.href }, document.title);
					Botzone.__entryHref = window.location.href;
				}
			} else {
				// 杀掉 Hash 修改的处理函数
				delete Botzone.__hashChangedAction;
			}
		};
		function isExternal(url) {
			var match = url.match(/^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/);
			if (typeof match[1] === "string" &&
				match[1].length > 0 &&
				match[1].toLowerCase() !== window.location.protocol)
				return true;
			if (typeof match[2] === "string" &&
				match[2].length > 0 &&
				match[2].replace(new RegExp
				(":(" + { "http:": 80, "https:": 443 }[window.location.protocol] + ")?$"), "") !== window.location.host)
				return true;
			return false;
		}
		var extractor = /<!--DYNLOADBEGIN-->[^\0]*?(?=<!--DYNLOADEND-->)/g;
		function replacePage(navigationTarget, backward) { // backward 其实应该写成 backwardOrForward

			// 杀掉 Hash 修改 / 页面刷新的处理函数
			delete Botzone.__hashChangedAction;
			delete Botzone.__refreshAction;

			// 进行自定义资源回收
			try {
				Botzone.__onExit && Botzone.__onExit();
			} catch (ex) {
				console.warn("OnExit handler failed to execute:", ex);
			}
			delete Botzone.__onExit;

			// 首先盖住原先页面
			$("body").append($("<div class=\"ajaxload-mask\"><img src='/images/connecting.gif' /></div>").fadeIn(300));

			// 移除表单提交的遮罩
			Botzone.ldscreen.fadeOut();

			// 移除所有tooltip和popover
			$('[role=tooltip], .popover').remove();

			// 移除还开着的对话框
			$(".modal.in").removeClass("fade").modal("hide").addClass("fade");

			// 用户浮框恢复到左上角避免拖长页面；隐藏表格导出
			dUserPopup.css({ top: 0, left: 0 });
			dTablePopup.css({ top: 0, left: 0 }).removeClass("active");

			// 主动触发离开页面的动作
			if (typeof Botzone.gio !== 'undefined' && Botzone.gio.connected)
				Botzone.gio.disconnect();

			Botzone.emulated_gio = undefined;

			// 杀掉来自 matchview 的 Timeline
			if (Botzone.rootTimeline)
				Botzone.rootTimeline.kill();
			Botzone.rootTimeline = undefined;

			function _replacePage() {
				if (typeof Botzone.gio !== 'undefined')
					Botzone.gio = undefined;

				// 然后拉取请求
				$.ajax({
					url: navigationTarget,
					type: 'GET',
					dataType: 'html',
					cache: true,
					complete: function (request, status) {
						// 从header里面获得当前页面的真实地址（避免重定向丢失信息）
						if (status == "success") {
							var loc = request.getResponseHeader("Current-Location");
							var a = document.createElement('a');
							a.href = loc;
							if (a.href.split('#')[0] == window.location.href.split('#')[0]) // 其实没有发生什么跳转？
								// 这种写法是为了保留 Hash
								window.history.replaceState({ href: window.location.href }, document.title, window.location.href);
							else
								window.history.replaceState({ href: loc }, document.title, loc);
						}
					},
					success: function (page) {
						// 开始替换内容
						var result = page.match(extractor);
						if (!result || result.length == 0) {
							// 不小心遇到了外部链接或文档格式不对
							window.location.href = navigationTarget;
							return;
						}
						for (var i = 0; i < result.length; i++)
							result[i] = result[i].substr("<!--DYNLOADBEGIN-->".length).trim();
						$.ajaxSetup({ cache: true });
						$("head title").replaceWith(result[0]);

						// 修改地址栏
						if (!backward)
							window.history.pushState({ href: navigationTarget }, $("title").text(), navigationTarget);
						Botzone.__entryHref = navigationTarget;
						if ($("#navBarBtnsOnTop").html(result[2]).find(".active").length > 0)
							$("#dNavDropDown").removeClass("active");
						$("a#headerBegin").nextUntil("a#headerEnd").remove();
						$("a#headerBegin").after(result[3]);
						$("body > div.container").find("iframe").each(function () {
							try {
								this.contentWindow.dispatchEvent(new Event('beforeunload'));
							} catch (ex) {}
						});
						$("body > div.container").html(result[4]);

						// 填充列表
						inflateLists();

						$("head meta#headBegin").nextUntil("head meta#headEnd").remove();
						$("a#headAddBegin").nextUntil("a#headAddEnd").remove();
						$("a#headAddBegin").after(result[1]);

						$.ajaxSetup({ cache: false });
						Botzone.__popoverToggles = $('.popover-toggle');
						if (!Botzone.io.connected)
							Botzone.io = Botzone.io_bak.connect();
						InitializeExpandableTable();
						$("[data-toggle=tooltip]").tooltip({ container: 'body' });
						
						FixCookies();
						ConnectFormSubmits();

						if (!backward)
							TweenMax.to(window, 0.3, { scrollTo: { y: 0 } });

						$(".ajaxload-mask").stop().fadeOut(300, function () {
							$(this).remove();
						});
					},
					error: function (jqXHR, textStatus, errorThrown) {
						var content = jqXHR.responseText;
						if (!content || content.length == 0) {
							alert("载入网页失败：" + (errorThrown || __(jqXHR.status)));
							$(".ajaxload-mask").remove();
							return;
						}
						window.location.href = navigationTarget;
					}
				});
			};
			_replacePage();
		}
		_gReplacePage = replacePage;
		$(document).on("click", "a[target!='_blank']", function (e) {
			var $this = $(this);
			if (e.ctrlKey || e.altKey || $this.data('noajax') || typeof NO_AJAX_LOAD != 'undefined')
				return true;
			if (this.pathname && this.pathname.indexOf('.') >= 0)
				return true;
			var navigationTarget = this.href;
			if (!navigationTarget || navigationTarget.length == 0 || navigationTarget.indexOf('javascript:') == 0 ||
				isExternal(navigationTarget) || navigationTarget.split('#')[0] == window.location.href.split('#')[0] ||
				navigationTarget[0] == '#')
				return true;

			// 决定采用AJAX载入新页面
			replacePage(navigationTarget);
			return false;
		});
	}

	if (Botzone.loggedIn) {
		$("#txtConnectURL_localai").val($("#aConnectURL_localai").prop("href"));

		// 发现新通知
		var currPage = 0, pageCount = 0, dMsgPrompt = $("#dMsgPrompt"), msgList = dMsgInnerMenu, sMsgCount = $("#sMsgCount");
		var btnMsgPrev = $("#btnMsgPrev"), btnMsgNext = $("#btnMsgNext");
		var UpdateMsgBtn = function () {
			if (currPage <= 0)
				btnMsgPrev.addClass("disabled");
			else
				btnMsgPrev.removeClass("disabled");
			if (currPage >= pageCount - 1)
				btnMsgNext.addClass("disabled");
			else
				btnMsgNext.removeClass("disabled");
		};
		var UpdateMsgList = function () {
			msgList.find(".list-group-item").remove();
			var html = "";
			for (var i = 0; i < 5 && currPage * 5 + i < _notifications.length; i++) {
				var currNotification = _notifications[currPage * 5 + i], href = "javascript:;", title = currNotification.title;
				if (currNotification.type == 'post') {
					href = "/discuss#" + currNotification.post;
				} else if (currNotification.type == 'match') {
					href = "/match/" + currNotification.match;
				} else if (currNotification.type == 'sender') {
					href = "javascript: ReadMsg(" + (currPage * 5 + i) + ");";
				} else if (currNotification.type == 'contest') {
					href = "/group/" + currNotification.contest.group + "#" + currNotification.contest._id;
				} else if (currNotification.type == 'group') {
					href = "/group/" + currNotification.group;
				}
				var content = currNotification.content;
				if (currNotification.content.length > 50)
					content = currNotification.content.substr(0, 50) + "...";
				html += "<a class=\"list-group-item\" href=\"" + href +
					"\"><h4 class=\"list-group-item-heading\">" + neutralize(title) +
					"</h4><p class=\"list-group-item-text\">" + neutralize(content) + "</p></a>";
			}
			msgList.prepend(html);
			UpdateMsgBtn();
		};
		btnMsgPrev.click(function () {
			if (currPage > 0)
				currPage--;
			UpdateMsgList();
		});
		btnMsgNext.click(function () {
			if (currPage <= pageCount - 1)
				currPage++;
			UpdateMsgList();
		});

		// 全局账户链接移上浮框效果
		$(document).on("mouseenter", "a[href^='/account/']", function () {
			var $this = $(this);
			dUserPopup.css({
				top: $this.offset().top,
				left: $this.offset().left,
				visibility: "visible"
			});
			pUserName.text($this.text());
			aViewHome.off("click").on("click", function () {
				this.href = $this[0].href;
			});
			aSendMsg.off("click").on("click", function () {
				$("#dIncomingMsg").hide();
				$("#txtNick_sendmsg").val($this.text());
				$("#iTargetID_sendmsg").val($this[0].href.split('/').pop());
				$("#dlgSendMsg").modal('show');
			});
		});
		dUserPopup.on("mouseenter", function () {
			dUserPopup.css("visibility", "");
		});

		// 右上动作栏鼠标移动展开项目效果
		$(".hovershow").hover(function () {
			var $this = $(this), newWidth, currWidth;
			this.style.removeProperty("background-color");
			var $normal = $this.find(".hovershow-normal"), $inner = $this.find(".hovershow-inner");
			currWidth = $this.outerWidth();
			this.style.removeProperty("width");
			$normal.hide();
			$inner.show();
			newWidth = $this.outerWidth();
			$this.css("width", currWidth);
			TweenMax.to($this, 0.3, {
				width: newWidth,
				clearProps: "width"
			});
		}, function () {
			var $this = $(this), newWidth, currWidth;
			var $normal = $this.find(".hovershow-normal"), $inner = $this.find(".hovershow-inner");
			currWidth = $this.outerWidth();
			this.style.removeProperty("width");
			$normal.show();
			$inner.hide();
			newWidth = $this.outerWidth();
			$this.css("width", currWidth);
			TweenMax.to($this, 0.3, {
				width: newWidth,
				clearProps: "width"
			});
		});

		// Bot 块鼠标移动展开效果
		//$(document).on("mouseenter", ".botblock", function () {

		//}).on("mouseleave", ".botblock", function () {

		//});

		// 读取收藏夹
		$.get("/favorites", UpdateFavorites, "json");

		// 可导出表格移上浮框效果
		$(document).on("mouseenter", "table.exportable:visible", function () {
			var $this = $(this);
			dTablePopup.css({
				top: $this.offset().top,
				left: $this.offset().left
			}).addClass("active");
			aExportCSV.off("click").on("click", function () {
				var csv = "\uFEFF" + Array.prototype.map.call(
					$this.find("> tr, > tbody > tr"),
					function (tr) {
						return Array.prototype.map.call(
							$(tr).find("> td, > th"),
							function (td) { return td.textContent.replace(/\n/g, "").trim(); }
						).join(",");
					}
				).join("\r\n");
				this.href = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
			});
		}).on("mouseleave", "table.exportable:visible", function () {
			dTablePopup.removeClass("active");
		});

		function resetExpChangeTimer(to) {
			if (timExpChange)
				clearTimeout(timExpChange);
			timExpChange = setTimeout(function () {
				timExpChange = null;
				dUserExp.playAnimation("out", function () {
					dUserExp.hide().removeClass("in").removeClass("out");
				});
			}, to);
		}

		// 账户缩略图移上弹出经验值框
		$(".navbar-right .smallavatar").hover(function () {
			if (!timExpChange)
				dUserExp.show().playAnimation("in");
			else
				clearTimeout(timExpChange);
		}, function () { resetExpChangeTimer(1000); });

		// 连接服务器获取实时消息
		reloadNotification = function () {
			if (!_notifications)
				return Botzone.io = Botzone.io_bak.connect();
			if (_notifications.length == 0) {
				msgList.find(".list-group-item").remove();
				dMsgPrompt.show();
				sMsgCount.hide();
				btnMsg.removeClass("msgbtn");
			} else {
				pageCount = Math.ceil(_notifications.length / 5);
				if (currPage < 0 || currPage >= pageCount)
					currPage = 0;
				UpdateMsgList();
				dMsgPrompt.hide();
				sMsgCount.text(_notifications.length).show();
				btnMsg.addClass("msgbtn").highlight(1000);
			}
		};
		Botzone.io = Botzone.io_bak.connect();
		Botzone.io.on("msg.update", function (data) {
			_notifications = data.notifications;
			reloadNotification();
		});

		// 收到广播
		Botzone.io.on("msg.broadcast", function (data) {
			lastBroadcast = data;
			if (data.content && data.content.length > 1) {
				var d = broadCast.show();
				d.find("header").text(__("msg.broadcast.title", lastBroadcast.authorname));
				d.find("p").html(data.content);
				d.data("id", data.id);
			} else
				broadCast.click();
		});

		Botzone.io.on("localai.statechange", function (data) {
			$(".localai-state").text(__("localai." + data));
		});

		function expr2level(expr) {
			var level;
			for (level = 0; expr >= Botzone.consts.user.lvupexp[level]; level++);
			return level;
		}

		// 收到经验值变动
		Botzone.io.on("exp.change", function (data) {
			Botzone.consts.user.lvupexp[-1] = 0;
			dUserExp.find(".reason").text((data.isdailymission ? __("exp.daily") : "") + __(data.reason) + " +" + data.delta).fadeIn();
			var level = expr2level(data.result);
			dUserExp.find(".level").text(__("exp.level", level));
			dUserExp.find(".exp-fill").css(
				"width",
				(data.result - Botzone.consts.user.lvupexp[level - 1]) * 100 / (Botzone.consts.user.lvupexp[level] - Botzone.consts.user.lvupexp[level - 1]) + "%"
			);
			setTimeout(function () {
				dUserExp.find(".reason").fadeOut();
			}, 2000);
			dUserExp.show().playAnimation("in");
			resetExpChangeTimer(2000);
		});

		// 准备接受通知
		Botzone.io.emit("msg.ready");

		if (!Botzone.tutorialDismissed)
			setTimeout(SetTutorial, 500, true);
	}

	$("[data-toggle=tooltip]").tooltip({ container: 'body' });

	// 初始化万物之源
	Botzone.replacePage = _gReplacePage;
	Botzone.viewSource = _gViewBotSrc;
	Botzone.allGames = _allGames;
	Botzone.allUsers = _allUsers;
	Botzone.allGroups = _allGroups;
	Botzone.buildingBlocks = {
		avatar: function (id) {
			return '<img class="smallavatar" height="30" width="30" src="/avatar/' + id + '.png" />';
		},
		username: function (id, name) {
			if (!name && typeof id === "object")
				return '<a target="_blank" href="/account/' + id._id + '">' + id.name + '</a>';
			return '<a target="_blank" href="/account/' + id + '">' + name + '</a>';
		}
	};

	Botzone.ldscreen = $("#loading");

	Botzone.generalErrorHandler = function (jqXHR, textStatus, errorThrown) {
		Botzone.ldscreen.stop().fadeOut();
		Botzone.alert(__("generalerror") + (errorThrown || __(jqXHR.status)));
	};

	Botzone.$ajax = function (method, action, data, cbSuccess, cbOrI18nFail, noMask) {
		if (!noMask)
			Botzone.ldscreen.stop().fadeIn();
		var cbFail;
		if (typeof cbOrI18nFail == "function")
			cbFail = cbOrI18nFail;
		else
			cbFail = Botzone.alert;
		$[method.toLowerCase()](action, data, function (result) {
			if (!noMask)
				Botzone.ldscreen.stop().fadeOut();
			if (result.success == false)
				cbFail(result.message);
			else
				cbSuccess(result);
		}, "json").fail(function (jqXHR, textStatus, errorThrown) {
			if (!noMask)
				Botzone.ldscreen.stop().fadeOut();
			cbFail(__(typeof cbOrI18nFail == "string" ? cbOrI18nFail : "generalerror") + (errorThrown || __(jqXHR.status)));
		});
	};

	Botzone.$get = function (action, data, cbSuccess, cbOrI18nFail, noMask) {
		Botzone.$ajax("get", action, data, cbSuccess, cbOrI18nFail, noMask);
	};
	Botzone.$post = function (action, data, cbSuccess, cbOrI18nFail, noMask) {
		Botzone.$ajax("post", action, data, cbSuccess, cbOrI18nFail, noMask);
	};

	Botzone.switchUser = function (to) {
		Botzone.$post("/account/switch/" + to, null, function () {
			window.location.reload();
		});
	};

	var $trailFocus = $('<span class="trail-focus glyphicon glyphicon-bookmark"></span>');
	$("body").append($trailFocus.hide());

	Botzone.trailFocus = function ($fromCtrl, $toCtrl) {
		var tl = new TimelineMax();
		var f = $fromCtrl.offset(), t = $toCtrl.offset();
		f.left += $fromCtrl.width() / 2, f.top += $fromCtrl.height();
		t.left += $toCtrl.width() / 2, t.top += $toCtrl.height();
		tl.fromTo($trailFocus.show(), 0.1, { opacity: 0 }, { opacity: 1 });
		tl.fromTo($trailFocus, 0.5, { x: f.left, y: f.top, scale: 2 }, { x: t.left, y: t.top, scale: 1 });
		tl.fromTo($trailFocus, 0.1, { opacity: 1 }, { opacity: 0 });
		tl.call(function () {
			$trailFocus.hide();
		});
	};

	var $instantAlert = $("#instantAlert").on('mouseenter', function () {
		$instantAlert.hide();
		clearTimeout(timAlertAutoHide);
		TweenMax.set($instantAlert, { clearProps: "transform" });
	}), timAlertAutoHide;

	Botzone.alert = function (html, forever) {
		clearTimeout(timAlertAutoHide);
		TweenMax.fromTo($instantAlert.html(html).show(), 0.3, { scale: 0 }, { scale: 1, ease: Back.easeOut });
		if (!forever)
			timAlertAutoHide = setTimeout(function () {
				TweenMax.fromTo($instantAlert, 0.2, { scale: 1 }, {
					scale: 0,
					clearProps: "transform",
					onComplete: function () {
						$instantAlert.hide();
					}
				});
			}, 3000);
	};

	Botzone.copy = function (str, successHTML, fallbackPrompt) {
		var $node;
		$node = $('<textarea style="position: absolute; opacity: 0"></textarea>');
		$node.val(str);
		$('body').append($node);
		$node[0].select();
		$node[0].setSelectionRange(0, $node[0].value.length);
		if (document.execCommand('copy'))
			Botzone.alert(successHTML);
		else
			window.prompt(fallbackPrompt, str);
		$node.remove();
	};

	Botzone.__entryHref = window.location.href;
	Botzone.defineHashChangedAction = function (fnAction) {
		Botzone.__hashChangedAction = fnAction;
		if (fnAction)
			fnAction(window.location.hash);
	};
	Botzone.defineRefreshAction = function (fnAction) {
		Botzone.__refreshAction = fnAction;
	};
	Botzone.onExit = function (fnAction) {
		if (Botzone.__onExit) {
			var oldFunction = Botzone.__onExit;
			Botzone.__onExit = function () {
				oldFunction();
				fnAction();
			};
		} else
			Botzone.__onExit = fnAction;
	};

	Botzone.recursiveAggregateProp = function (domNode, resultScope) {
		var ret = false;
		for (var i = 0; i < domNode.childNodes.length; i++) {
			var node = domNode.childNodes[i];
			if (!node.dataset) {
				if (Botzone.recursiveAggregateProp(node, resultScope))
					ret = true;
				continue;
			}

			var x;
			if (x = node.dataset['key'])
				resultScope[x] = node.value;
			if ('exists' in node.dataset)
				ret = ret || node.checked;
			if (x = node.dataset['scope']) {
				var scope = {};
				if (Botzone.recursiveAggregateProp(node, scope))
					resultScope[x] = scope;
			} else if (Botzone.recursiveAggregateProp(node, resultScope))
				ret = true;
		}
		return ret;
	};

	Botzone.quickMatch = function (ctrl) {
		var $form = $(ctrl).closest("form");
		Botzone.replacePage("/quickmatch/" + $form.data("botid") + "?" + $form.serialize());
	};

	Botzone.quickMatchLink = function (ctrl) {
		var $form = $(ctrl).closest("form");
		Botzone.copy(window.location.host + "/quickmatch/" + $form.data("botid") + "?" + $form.serialize(),
			__("quickmatch.copy.success"), __("quickmatch.copy.prompt"));
	};
});

export function ParseURLAction(url) {
	var a = document.createElement("a");
	a.href = url;
	if (a.hostname == "")
		a.href = a.href;
	var parts = (a.pathname || "home").split('/').filter(function (val) { return val.trim() != ""; });
	if (parts.length == 0)
		parts.push("home");
	return parts;
}

/*
 * Botzone 2.0 游戏管理页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

//// Game修改表单逻辑 - 始

var confModifyGame = new FormConfig({
	method: "post",
	ajaxFile: true,
	action: "/game/modify",
	finalValidate: function (form) {
		form.find("input[type=file]").each(function (i, ele) {
			ele = $(ele);
			if (ele.val() != "")
				ele.prop("name", ele.data("name"));
			else
				ele.prop("name", "");
		});
		return true;
	},
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			setTimeout(function () { Botzone.replacePage(location.href); }, 1000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkGameAltName = function (n) {
	if (n == "" || n == null)
		return null;
	else if (n.length > Botzone.consts.game.name_length)
		return __("gamealtname.toolong");
	return null;
};

validateFunctions.checkGameDesc = function (desc) {
	if (desc == "" || desc == null)
		return __("gamedesc.nonnull");
	else if (desc.length > Botzone.consts.game.desc_length)
		return __("gamedesc.toolong");
	return null;
};

validateFunctions.checkRequestFromJSON = function () {
	var code;
	$("#iRequestFromJSON").val(Base64.encode(code = editorReqFromJSON.getValue()));
	if (!$("#chkEnableSimpleIO_game").prop("checked"))
		return null;
	if (code == "" || code == null)
		return __("code.nonnull");
	else if (code.length > Botzone.consts.game.transform_code_max_length)
		return __("code.toolong");
	return null;
};

validateFunctions.checkResponseFromJSON = function () {
	var code;
	$("#iResponseFromJSON").val(Base64.encode(code = editorResFromJSON.getValue()));
	if (!$("#chkEnableSimpleIO_game").prop("checked"))
		return null;
	if (code == "" || code == null)
		return __("code.nonnull");
	else if (code.length > Botzone.consts.game.transform_code_max_length)
		return __("code.toolong");
	return null;
};

validateFunctions.checkResponseToJSON = function () {
	var code;
	$("#iResponseToJSON").val(Base64.encode(code = editorResToJSON.getValue()));
	if (!$("#chkEnableSimpleIO_game").prop("checked"))
		return null;
	if (code == "" || code == null)
		return __("code.nonnull");
	else if (code.length > Botzone.consts.game.transform_code_max_length)
		return __("code.toolong");
	return null;
};

//// Game修改表单逻辑 - 终

function TestMatch() {
	ctrl = document.getElementById('cmbGame');
	window.location.href = "/testmatch?gamename=" + $(ctrl.options[ctrl.selectedIndex]).text();
}

var editorReqFromJSON, editorResToJSON, editorResFromJSON;

function UpdateDesc(ctrl) {
	var game;
	for (var i = 0; i < games.length; i++)
		if (games[i]._id == ctrl.value)
			game = games[i];
	if (!game)
		return;
	var future = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
	$.cookie("gametable-last-active-game", ctrl.value, { expires: future, path: '/' });

	$("#txtAltName_game").val(game.alt_name);
	$("#txtDescription_game").text(game.desc);
	$("#chkFreezeBots_game")[0].checked = game.freeze_bots;
	$("#chkROUserdata_game")[0].checked = game.ro_userdata;
	$("#chkEnableKeepRunning_game")[0].checked = game.judge_enable_keep_running;
	$("#chkPublic_game")[0].checked = game.public;
	$("#chkBalanced_game")[0].checked = game.balanced;
	$("#chkEnableSimpleIO_game")[0].checked = game.transform_code.supported;
	$("#transformCode").collapse(game.transform_code.supported ? 'show' : "hide");
	editorReqFromJSON.setValue(game.transform_code.request_from_json);
	editorResToJSON.setValue(game.transform_code.response_to_json);
	editorResFromJSON.setValue(game.transform_code.response_from_json);
}

$(document).ready(function () {
	AceEditorRequirePathFix();
	var lastGame = $.cookie("gametable-last-active-game");
	var cmb;
	if (lastGame)
		cmb = $("#cmbGame option[value=" + lastGame + "]").prop("selected", true);

	try {
		editorReqFromJSON = ace.edit("txtRequestFromJSON_game");
		editorReqFromJSON.getSession().setMode("ace/mode/javascript");
		editorReqFromJSON.getSession().setUseWrapMode(true);
	} catch (ex) { }
	try {
		editorResToJSON = ace.edit("txtResponseToJSON_game");
		editorResToJSON.getSession().setMode("ace/mode/javascript");
		editorResToJSON.getSession().setUseWrapMode(true);
	} catch (ex) { }
	try {
		editorResFromJSON = ace.edit("txtResponseFromJSON_game");
		editorResFromJSON.getSession().setMode("ace/mode/javascript");
		editorResFromJSON.getSession().setUseWrapMode(true);
	} catch (ex) { }

	$("#btnViewJudgeSource").click(function () {
		$("#dlgViewSource h4").html(__("viewjudgesource"));
		var codebox = $("#dlgViewSource pre").text(__("loading"));
		var downloadlink = $("#dlgViewSource .download");
		var game = $("#cmbGame").val();
		$.get("/game/viewsrc/", { game: game, typ: "judge" }, function (data) {
			if (data.binary) {
				codebox.hide();
				downloadlink.show()
					.prop("href", "/game/viewsrc?typ=judge&game=" + game + "&download=true");
				return;
			}
			downloadlink.hide();
			// 启用代码高亮
			codebox.show().replaceWith($("<pre class=\"prettyprint\"></pre>").text(data.message));
			prettyPrint();
		}, "json");
	});
	$("#btnViewPlayerSource").click(function () {
		$("#dlgViewSource h4").html(__("viewplayersource"));
		var codebox = $("#dlgViewSource pre").text(__("loading"));
		$.get("/game/viewsrc", { game: $("#cmbGame").val(), typ: "player" }, function (data) {
			// 启用代码高亮
			codebox.replaceWith($("<pre class=\"prettyprint\"></pre>").text(data.message));
			prettyPrint();
		}, "json");
	});
	var checkbox = $("#chkEnableSimpleIO_game"), updateCollapse;
	checkbox.closest("label").click(updateCollapse = function () {
		$("#transformCode").collapse(checkbox.prop("checked") ? 'show' : "hide");
	});
	if (games[0]) {
		editorReqFromJSON.setValue(games[0].transform_code.request_from_json);
		editorResToJSON.setValue(games[0].transform_code.response_to_json);
		editorResFromJSON.setValue(games[0].transform_code.response_from_json);
	}

	Botzone.onExit(function () {
		editorReqFromJSON.destroy();
		editorResToJSON.destroy();
		editorResFromJSON.destroy();
	});

	if (lastGame && cmb.length > 0)
		UpdateDesc(cmb[0]);
	else
		updateCollapse();
});
/// <reference path="jquery-2.1.0.js" />
/// <reference path="bootstrap.js" />
/// <reference path="../../ideref/TweenMax.js" />
/*
 * Botzone 2.0 Bot管理页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架、aceeditor
 */

var currBot = {}, currItem, isNewBot = true, dUpload, dEditCode, editor, tabRankMatches;
var language = {
	cpp: "c_cpp",
	cpp11: "c_cpp",
	cpp17: "c_cpp",
	cpp17a: "c_cpp",
	cppo0: "c_cpp",
	js: "javascript",
	py: "python",
	py3: "python",
	py36: "python",
	pas: "pascal",
	java: "java",
	cs: "csharp"
};
var fnUpdateRankTrend = function () { }, fnUpdateGlobalData = function () { }, charts = [];

//// Bot增改表单逻辑 - 始

var confCreateBot = new FormConfig({
	method: "post",
	ajaxFile: true,
	action: "/mybots/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			if (result.warnings) {
				this.setFormResponse(__("create.success.warning", result.warnings), false);
				$("#panCreate .alert").css({ whiteSpace: "pre" });
			} else
				this.setFormResponse(__("create.success"), false);
			currBot = result.bot;
			if (isNewBot) {
				var template = $("#botTemplate").clone(true);
				template.find("a")
					.data("botid", result.bot._id)
					.data("opensrc", result.bot.opensource)
					.data("ext", result.bot.extension)
					.data("enablekeeprunning", result.bot.enable_keep_running)
					.data("simpleio", result.bot.simpleio)
					.data("gameid", result.bot.game);
				template.find("h4").text(result.bot.name);
				template.find("p.botversion span").text(0);
				template.find("p.botdesc").text(result.bot.desc);
				if (Botzone.id2game[result.bot.game].min_player_num < 2)
					template.find("[name=btnRankBot]").addClass("disabled");
				else
					template.find("[name=btnRankBot]").removeClass("disabled");
				var hrefs = template.find(".hover-menu a");
				hrefs[0].href = '/game/ranklist/' + result.bot.game + '/' + result.bot._id;
				hrefs[1].href = '/game/ranklist/match/' + result.bot._id;
				template.find("span.rankscore").text(__("mybots.rankscore", result.bot.score.toFixed(2)));
				$("#game" + result.bot.game).append(template.show()).closest(".panel").show();
			} else {
				currItem.find("p.botversion span").text(currBot.versions.length - 1);
			}
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confModifyBot = new FormConfig({
	method: "post",
	action: "/mybots/modify",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("modify.success"), false);
			currItem.find("p.botdesc").text($("#txtDescription_bot_modify").val());
			currItem.data("opensrc", $("#chkOpenSource_bot_modify").prop("checked"));
			currItem.data("enablekeeprunning", $("#chkEnableKeepRunning_bot_modify").prop("checked"));
			currItem.data("simpleio", $("#chkSimpleIO_bot_modify").prop("checked"));
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkBotName = function (nick) {
	if (nick == "" || nick == null)
		return __("botname.nonnull");
	else if (/[0-9]+/.test(nick.substr(0, 1)))
		return __("botname.numprecede");
	else if (nick.length < Botzone.consts.bot.name_length_min)
		return __("botname.tooshort");
	else if (nick.length > Botzone.consts.bot.name_length_max)
		return __("botname.toolong");
	else if (!/^[_A-Za-z0-9\u4e00-\u9fa5]+$/.test(nick))
		return __("botname.invalidchar");
	return null;
};

validateFunctions.checkBotDesc = function (desc) {
	if (desc == "" || desc == null)
		return __("botdesc.nonnull");
	else if (desc.length > Botzone.consts.bot.desc_length_max)
		return __("botdesc.toolong");
	return null;
};

validateFunctions.checkSource = function (src) {
	if (dEditCode.is(":visible"))
		return;
	if (src == "" || src == null)
		return __("botsrc.nonnull");
	return null;
};

validateFunctions.checkCode = function () {
	if (dUpload.is(":visible"))
		return;
	var code;
	$("#iCode_bot").val(Base64.encode(code = editor.getValue()));
	if (code == "" || code == null)
		return __("botcode.nonnull");
	else if (code.length > 1000000)
		return __("botcode.toolong");
	return null;
};

//// Bot增改表单逻辑 - 终

function UpdateSimpleIOEnabled(ctrl) {
	if (!ctrl.disabled)
		$("#chkSimpleIO_bot")[0].disabled = !$(ctrl.options[ctrl.selectedIndex]).data("enableSimpleio");
}

function UpdateEditorLanguage() {
	editor.getSession().setMode("ace/mode/" + language[document.getElementById("cmbCompiler").value]);
}

function UpdateTimeout() {
	var factor = Botzone.consts.bot.lang_timeout_factor[document.getElementById("cmbCompiler").value];
	$(".time_limit").text(factor[0]);
	$(".keep_running_subsequent_turn_time_limit").text(factor[1]);
}

function ShowCodeEditor() {
	confCreateBot.ajaxFile = false;
	confCreateBot.action = "/mybots/create_plain";
	$("#ofdSourceCode_bot").val("");
	if (isNewBot) {
		UpdateEditorLanguage();
		dUpload.fadeOut(200, function () {
			dEditCode.fadeIn(200);
		});
		return;
	}
	Botzone.$get("/mybots/viewsrc/" + currBot._id, null, function (data) {
		editor.setValue(data.message);
		UpdateEditorLanguage();
		dUpload.fadeOut(200, function () {
			dEditCode.fadeIn(200);
		});
	}, function (errorThrown) {
		editor.setValue(__("mybots.bottable.loadfail") + errorThrown);
	});

}

function HideCodeEditor() {
	confCreateBot.ajaxFile = true;
	confCreateBot.action = "/mybots/create";
	if (dUpload.is(":visible"))
		return;
	$("#iCode_bot").val("");
	editor.setValue("");
	dEditCode.fadeOut(200, function () {
		dUpload.fadeIn(200);
	});
}

function SetLastActiveGame(ctrl) {
	var future = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
	$.cookie("mybots-last-active-game", ctrl.hash, { expires: future, path: '/' });
}

$(document).ready(function () {
	AceEditorRequirePathFix();

	tabRankMatches = $("#tabRankMatches");

	Botzone.onExit(function () {
		if (charts[0])
			charts[0].destroy();
		if (charts[1])
			charts[1].destroy();
		charts[0] = charts[1] = undefined;
	});

	$($.cookie("mybots-last-active-game")).addClass("in");

	var panCreate = $("#panCreate"), panModify = $("#panModify");
	var tabDetail = $("#dBotInfo table");
	dUpload = $("#dUpload");
	dEditCode = $("#dEditCode");
	$("#btnCreateFormClose").click(function () {
		var tl = new TimelineMax();
		tl.fromTo(panCreate, 0.2, { opacity: 1, x: "0%" }, { opacity: 0, x: "100%" });
		tl.call(function () {
			panCreate.hide();
			panModify.show();
		});
		tl.fromTo(panModify, 0.2, { opacity: 0, x: "100%" }, { opacity: 1, x: "0%" });
	});
	$("#btnCreate").click(function () {
		HideCodeEditor();
		$("#btnInheritVersion").text(__("mybots.inheritversion.new"));
		isNewBot = true;
		var tl = new TimelineMax();
		tl.fromTo(panModify, 0.2, { opacity: 1, x: "0%" }, { opacity: 0, x: "100%" });
		tl.call(function () {
			panModify.hide();
			panCreate.show();
		});
		tl.fromTo(panCreate, 0.2, { opacity: 0, x: "100%" }, { opacity: 1, x: "0%" });
		panCreate.find("#txtName_bot").val("").prop("disabled", false);
		panCreate.find("#cmbCompiler").prop("disabled", false);
		panCreate.find("#cmbGame").prop("disabled", false).change();
		panCreate.find("label[for=txtDescription_bot]").text(__("mybots.desc"));
		panCreate.find("#chkOpenSource_bot").prop("disabled", false);
		panCreate.find("#chkEnableKeepRunning_bot").prop("disabled", false);
		panCreate.find("#infVersion").text("0");
		panCreate.find("#iNewVersionBotID").val("");
		panCreate.find("h3").text(__("mybots.createnew"));
	});
	$(document).off("click", ".botlistitem").on("click", ".botlistitem", function (event) {
		if (!panModify.is(":visible")) {
			var tl = new TimelineMax();
			tl.fromTo(panCreate, 0.2, { opacity: 1, x: "0%" }, { opacity: 0, x: "100%" });
			tl.call(function () {
				panCreate.hide();
				panModify.show();
			});
			tl.fromTo(panModify, 0.2, { opacity: 0, x: "100%" }, { opacity: 1, x: "0%" });
		}
		$(".botlistitem").removeClass("active");
		currItem = $(this).addClass("active");
		var id = currItem.data("botid");
		if (!id || id.length == 0)
			return;
		currBot._id = currItem.data("botid"),
			currBot.name = currItem.find("h4").text(),
			currBot.version = currItem.find("p.botversion span").text(),
			currBot.opensource = currItem.data("opensrc"),
			currBot.extension = currItem.data("ext"),
			currBot.enable_keep_running = currItem.data("enablekeeprunning"),
			currBot.simpleio = currItem.data("simpleio"),
			currBot.gameid = currItem.data("gameid");
		$("#iBotID_modify").val(currBot._id);
		$("#infName").val(currBot.name);
		$("#txtDescription_bot_modify").val(currItem.find("p.botdesc").text());
		var chkbox = document.getElementById("chkOpenSource_bot_modify");
		if (chkbox)
			chkbox.checked = currBot.opensource;
		chkbox = document.getElementById("chkEnableKeepRunning_bot_modify");
		if (chkbox)
			chkbox.checked = currBot.enable_keep_running;
		chkbox = document.getElementById("chkSimpleIO_bot_modify");
		if (chkbox) {
			chkbox.checked = currBot.simpleio;
			chkbox.disabled = !$("#cmbGame [value=" + currBot.gameid + "]").data("enableSimpleio");
		}
		tabDetail.find("tr:gt(2)").remove();
		Botzone.$get("/mybots/detail/" + currBot._id, null, function (data) {
			tabDetail.find("tr.loadfail").addClass("hidden");
			currBot = data.bot;

			// 画图
			if (currBot.ranked)
				$("#pNotRanked").hide();
			else
				$("#pNotRanked").show();

			fnUpdateRankTrend = function () {
				var lblOverview = [];
				for (var i = 0; i < currBot.rank_trend_overview.length; i++)
					lblOverview[i] = (i * 100 / (currBot.rank_trend_overview.length - 1)).toFixed(1) + '%';

				var lblRecent = [];
				for (var i = 0; i < currBot.rank_trend_recent.length; i++)
					lblRecent[i] = currBot.realrankplaycount - currBot.rank_trend_recent.length + i + 1;

				if (charts[0])
					charts[0].destroy();
				if (charts[1])
					charts[1].destroy();

				function chartConfiguration(labels, datasource) {
					return {
						type: 'line',
						data: {
							labels: labels,
							datasets: [
								{
									data: datasource || [],
									backgroundColor: "rgba(151,187,205,0.2)",
									borderColor: "rgba(151,187,205,1)",
									pointBackgroundColor: "rgba(151,187,205,1)",
									pointBorderColor: "#fff",
									pointHoverBackgroundColor: "#fff",
									pointHoverBorderColor: "rgba(151,187,205,1)"
								}
							]
						},
						options: {
							legend: {
								display: false
							},
							tooltips: {
								intersect: false,
								mode: 'x'
							},
							scales: {
								xAxes: [{
									ticks: {
										maxRotation: 0
									}
								}]
							}
						}
					};
				}

				charts[0] = new Chart(document.getElementById("canvasRankOverview").getContext("2d"),
					chartConfiguration(lblOverview, currBot.rank_trend_overview));
				charts[1] = new Chart(document.getElementById("canvasRankRecent").getContext("2d"),
					chartConfiguration(lblRecent, currBot.rank_trend_recent));
			};
			fnUpdateRankTrend();

			// 填充 GlobalData
			try {
				currBot.globaldata = JSON.stringify(JSON.parse(currBot.globaldata), null, '\t');
			} catch (ex) { }

			fnUpdateGlobalData = function () {
				$("#dBotGlobalData pre").replaceWith($("<pre id=\"txtGlobalData\" class=\"prettyprint\"></pre>").text(currBot.globaldata));
				prettyPrint();
			};
			fnUpdateGlobalData();

			// 填充对局表
			tabRankMatches.find("tr:gt(0)").remove();
			tabRankMatches.find("tr").after(data.table);
			tabRankMatches.find("tr:gt(0)").each(function (i) {
				var delta = currBot.rank_trend_recent[currBot.rank_trend_recent.length - i - 1] -
					(currBot.rank_trend_recent[currBot.rank_trend_recent.length - i - 2] || Botzone.consts.bot.default_score);
				if (delta > 0)
					$(this).append('<td class="victory-increase"><span class="glyphicon glyphicon-arrow-up"></span><span class="amount">' +
						delta.toFixed(2) + '</span></td>');
				else if (delta < 0)
					$(this).append('<td class="defeated-decrease"><span class="glyphicon glyphicon-arrow-down"></span><span class="amount">' +
						-delta.toFixed(2) + '</span></td>');
				else
					$(this).append('<td>-</td>');
			});

			// 填充版本表格
			for (var i = currBot.versions.length - 1; i >= 0; i--)
				(function (i) {
					var curr = currBot.versions[i];
					var row = tabDetail.find("tr:eq(1)").clone();
					if (curr.disabled)
						row.addClass("text-muted");
					var cells = row.find("td");
					cells.eq(0).text(i).append("<small>(" + new Date(parseInt(curr._id.substr(0, 8), 16) * 1000) + ")</small>");
					cells.eq(1).text(currBot.versions[i].desc);
					cells.eq(2).find("button[name=btnViewSource]").click(function () {
						Botzone.viewSource(currBot._id, currBot.name, i);
					}).find("span.ext").text("source." + currBot.extension);
					cells.eq(2).find(".btnCopyID").click(function () {
						Botzone.copy(curr._id, __("copy.success"), __("copy.prompt"));
					});
					var $btnDisableVersion = cells.eq(2).find(".btnDisableVersion");
					
					if (i == currBot.versions.length - 1) {
						$btnDisableVersion
							.addClass("disabled")
							.tooltip({ title: __("bot.version.disable.latest"), container: "body", placement: "top" });
					} else {
						$btnDisableVersion.click(function () {
							var $this = $(this);
							Botzone.$post("/mybots/disableversion", {
								botvid: curr._id, disabled: !curr.disabled
							}, function (data) {
								$this.toggleClass("active");
								row.toggleClass("text-muted");
							});
						}).tooltip({ title: __("bot.version.disable"), container: "body", placement: "top" });
					}
					if (curr.disabled)
						$btnDisableVersion.addClass("active");
					
					cells.eq(2).find(".btnFavorite").click(function () {
						AddFavoriteBot(this, currBot._id, i);
					});
					cells.eq(3).find(".diff").data("id", currBot._id).data("ver", i);

					// 快速对局
					if (data.quickMatch) {
						var $form = $($("#frmQuickMatch")[0].outerHTML).prop("id", "").show();
						$form.data("botid", curr._id);
						cells.eq(2).find(".quick-match").show().popover({
							title: __("quickmatch.create.title"),
							content: $form,
							placement: "left",
							html: true
						});
						Botzone.__popoverToggles = $('.popover-toggle');
					} else
						cells.eq(2).find(".quick-match").hide();

					tabDetail.append(row.removeClass("hidden"));
				})(i);
		}, function (errorThrown) {
			tabDetail.find("tr.loadfail").removeClass("hidden").find("td").text(__("mybots.bottable.loadfail") + errorThrown);
		});
	});
	$("[name=btnRankBot]").click(function () {
		if (!confirm(__("mybots.rankclear")))
			return;
		var btn = $(this),
			item = btn.closest("li").find(".botlistitem");
		btn.addClass("disabled");
		$.post("/mybots/rankbot", { botid: item.data("botid") }, function (result) {
			btn.removeClass("disabled")
			if (result.success == true) {
				if (result.bot.ranked) {
					btn.closest("ul").find("[name=btnRankBot]").removeClass("active")
						.find(".glyphicon").removeClass("glyphicon-star").addClass("glyphicon-star-empty");
					btn.addClass("active").find(".glyphicon").addClass("glyphicon-star").removeClass("glyphicon-star-empty");
				} else {
					btn.removeClass("active").find(".glyphicon").removeClass("glyphicon-star").addClass("glyphicon-star-empty");

					if (result.bot.game.min_player_num < 2)
						btn.closest("li").find("[name=btnRankBot]").addClass("disabled");
					else
						btn.closest("li").find("[name=btnRankBot]").removeClass("disabled");
				}
				btn.find("span.rankscore").text(__("mybots.rankscore", result.bot.score.toFixed(2)));
			} else
				alert(result.message);
		}, "json");
	});
	$("[name=btnAddVersion]").click(function () {
		HideCodeEditor();
		$("#btnInheritVersion").text(__("mybots.inheritversion"));
		isNewBot = false;
		if (!panCreate.is(":visible")) {
			var tl = new TimelineMax();
			tl.fromTo(panModify, 0.2, { opacity: 1, x: "0%" }, { opacity: 0, x: "100%" });
			tl.call(function () {
				panModify.hide();
				panCreate.show();
			});
			tl.fromTo(panCreate, 0.2, { opacity: 0, x: "100%" }, { opacity: 1, x: "0%" });
		}
		$(".botlistitem").removeClass("active");
		currItem = $(this).closest("li").find(".botlistitem").addClass("active");
		currBot._id = currItem.data("botid"),
			currBot.name = currItem.find("h4").text(),
			currBot.version = currItem.find("p.botversion span").text(),
			currBot.opensource = currItem.data("opensrc"),
			currBot.extension = currItem.data("ext"),
			currBot.enable_keep_running = currItem.data("enablekeeprunning"),
			currBot.simpleio = currItem.data("simpleio"),
			currBot.gameid = currItem.data("gameid");
		panCreate.find("#txtName_bot").val(currBot.name).prop("disabled", true);
		panCreate.find("#cmbCompiler").val(currBot.extension).prop("disabled", true).change();
		panCreate.find("#cmbGame").val(currBot.gameid).prop("disabled", true);
		panCreate.find("label[for=txtDescription_bot]").text(__("mybots.bottable.th.stat"));
		panCreate.find("#chkOpenSource_bot").prop("disabled", true).prop("checked", currBot.opensource);
		panCreate.find("#chkEnableKeepRunning_bot").prop("disabled", true).prop("checked", currBot.enable_keep_running);
		panCreate.find("#chkSimpleIO_bot").prop("disabled", true).prop("checked", currBot.simpleio);
		panCreate.find("#infVersion").text(parseInt(currBot.version) + 1);
		panCreate.find("#iNewVersionBotID").val(currBot._id);
		panCreate.find("h3").text(__("mybots.addver"));
	});
	$("[name=btnRemoveBot]").click(function () {
		var item = $(this).closest("li").find(".botlistitem");
		$("#dlgDelConfirm .modal-body p").html(__("mybots.delete.confirm", item.find("h4").text()));
		$("#dlgDelConfirm .modal-footer button[type=submit]").off("click").on("click", function () {
			Botzone.$post("/mybots/delete", { botid: item.data("botid") }, function (data) {
				$("#dlgDelConfirm .modal-body .alert").slideUp();
				$("#dlgDelConfirm").modal('hide');
				item.closest("li").remove();
			}, function (errorThrown) {
				$("#dlgDelConfirm .modal-body .alert").slideDown().text(errorThrown).removeClass("alert-success").addClass("alert-danger");
			});
		});
	});
	//$('#aViewRankTrend').on('shown.bs.tab', function (e) {
	//	fnUpdateRankTrend();
	//});
	//$('#aViewGlobalData').on('shown.bs.tab', function (e) {
	//	fnUpdateGlobalData();
	//});
	try {
		editor = ace.edit("txtCode_bot");
		editor.getSession().setUseWrapMode(true);
	} catch (ex) {
		console.warn(ex);
	}
	Botzone.onExit(function () {
		editor && editor.destroy();
	});
});

function Diff(ctrl) {
	var $this = $(ctrl);
	var $table = $this.closest("table");
	if ($this.hasClass("btn-info")) {
		// 选择 A
		$table.find(".diff:gt(0)").removeClass("btn-info").addClass("btn-success").text(__("diff.b")).prop("href", "javascript:;").prop("target", "");
		$this.removeClass("btn-success").addClass("active btn-warning").text(__("diff.cancel"));
	} else if ($this.hasClass("btn-success")) {
		// 选择 B
		$this.prop("href", "/mybots/diff/" + $this.data("id") + "/" + $table.find(".diff.active").data("ver") + "/" + $this.data("ver")).prop("target", "_blank");
	} else {
		// 选择了 A -> 取消选中
		$table.find(".diff:gt(0)").removeClass("btn-success active btn-warning").addClass("btn-info").text(__("diff.a")).prop("href", "javascript:;").prop("target", "");
	}
}

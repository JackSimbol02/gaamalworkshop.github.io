/*
 * Botzone 2.0 游戏室控制脚本
 * 作者：zhouhy
 * 需求：jQuery、socket.io
 */

var list, currSlot = 0, slots = [], slotdom = [], currBot, txtVersion, btnAutoMatch, playerNames, loglist;
var currReceivedArgu = {};
var gameid = readyMessage.gameid;

function SendMsg() {
	var txtbox = $("#txtMessageToSend");
	Botzone.gio.emit('gametable.send', txtbox.val());
	var viewbox = $("#txtMsgRecord");
	viewbox.append(__("me") + ": " + txtbox.val() + "\n").animate({
		scrollTop: viewbox[0].scrollHeight
	});
	txtbox.val("");
}

validateFunctions.checkVersion = function (ver) {
	if (ver == "" || ver == null)
		return __("ver.nonnull");
	else if (parseInt(ver) >= currBot.versions.length)
		return __("ver.toolarge");
	return null;
};

function OnGametableChange(data) {
	var hasRankedBot = false;
	for (var i = 0; i < data.length; i++) {
		var dom = slotdom[i];
		if (data[i].type == "bot" && data[i].id != "" && data[i].ranked)
			hasRankedBot = true;
		if (slots[i].type != data[i].type) {
			dom.find("select.cmbSlotType").val(slots[i].type = data[i].type);
			if (isOwner)
				if (slots[i].type != "bot") {
					slotdom[i].find(".dBotSlot").fadeOut((function (i) {
						slotdom[i].find(".dSlotName").removeClass("col-md-5").addClass("col-md-10");
					}).bind(null, i));
				} else {
					slotdom[i].find(".dBotSlot").fadeIn();
					slotdom[i].find(".dSlotName").removeClass("col-md-10").addClass("col-md-5");
				}
		}
		if (slots[i].id != data[i].id) {
			dom.find("input.txtSlotName")
				.val(slots[i].name = data[i].name)
				.data("id", slots[i].id = data[i].id)
				.data("origname", data[i].name)
				.data("botid", slots[i].botid = data[i].botid)
				.data("ranked", slots[i].ranked = data[i].ranked);
			if (data[i].id == userMe._id)
				dom.addClass("currplayer");
			else
				dom.removeClass("currplayer");
		}
	}
	if (btnAutoMatch.hasClass("disabled") == (isOwner && hasRankedBot))
		btnAutoMatch.toggleClass("disabled");
}

function OnArguChange(data) {
	currReceivedArgu = data;
	$("#numTimelimit").val(data.humanTimeout);
	if ("forkArgu" in data && data.forkArgu.turnid > 0) {
		$(".welcomemsg").hide();
		$(".forkmsg").show().find(".msg").html(
			__("gametable.fork.msg", data.forkArgu.matchid, data.forkArgu.turnid)
		);
	} else {
		$(".forkmsg").hide();
	}
}

function UpdateCurrPlayer() {
	var currInput = $(".currplayer input");
	if ($("#chkEnableLocalAI").prop("checked"))
		currInput.val(currInput.data("origname") + __("localai.replacedby"));
	else
		currInput.val(currInput.data("origname"));
}

$(document).ready(function () {
	$(".disable-before-connection").each(function () {
		var $this = $(this);
		if ($this.hasClass("disabled") || $this.prop("disabled"))
			$this.removeClass("disable-before-connection");
		else
			$this.prop("disabled", true);
	});

	if (currGame.coders) {
		// 填充用户列表
		var userOptionsHtml = "";

		// 临时修复（有的游戏coder列表有重复……）
		var alreadyExist = {};
		alreadyExist[userMe._id] = true;
		for (var i = 0; i < currGame.coders.length; i++) {
			var id = currGame.coders[i]._id;
			if (!alreadyExist[id]) {
				alreadyExist[id] = true;
				userOptionsHtml += '<option value="' + id + '">' + currGame.coders[i].name + '</option>';
			}
		}
		$("#cmbgrpOtherUsers").html(userOptionsHtml);
	}

	Botzone.gio = Botzone.io_bak.connect(window.location.host + '/room');
	Botzone.gio.connect(); // 再次连接，保证连上

	//$("[data-toggle=tooltip]").tooltip({ placement: 'bottom' });

	txtVersion = $("#dlgBotSelect .modal-footer input[type=text]");

	Botzone.gio.removeAllListeners('gametable.chat.new');
	Botzone.gio.removeAllListeners('gametable.chat.err');
	Botzone.gio.removeAllListeners('gametable.change');
	Botzone.gio.removeAllListeners('gametable.kick');
	Botzone.gio.removeAllListeners('gametable.destroy');
	Botzone.gio.removeAllListeners('gametable.start');
	Botzone.gio.removeAllListeners('gametable.arguchange');

	DisplaySocketStatus(Botzone.gio, $("#dConnectionStat"),
		'<span class="glyphicon glyphicon-ok-circle"></span><span>' + __("io.connect") + '</span>',
		function () {
			// 发送ready事件
			Botzone.gio.emit('gametable.ready', readyMessage);
			$(".disable-before-connection").prop("disabled", false);
		});

	// 监听新聊天信息
	Botzone.gio.on('gametable.chat.new', function (data) {
		var viewbox = $("#txtMsgRecord");
		viewbox.append(data.author + ": " + data.message + "\n").animate({
			scrollTop: viewbox[0].scrollHeight
		});
	});

	// 监听错误信息
	Botzone.gio.on('gametable.chat.err', function (data) {
		alert(data.message + __("gametable.err.advice"));
		Botzone.replacePage("/");
	});

	// 监听游戏桌变化
	Botzone.gio.on('gametable.change', OnGametableChange);

	// 监视参数变化
	Botzone.gio.on('gametable.arguchange', OnArguChange);

	// 监听被踢事件
	Botzone.gio.on('gametable.kick', function (data) {
		Botzone.replacePage("/?msg=kicked");
	});

	// 监听游戏桌被关
	Botzone.gio.on('gametable.destroy', function (data) {
		Botzone.replacePage("/?msg=destroyed");
	});

	// 监听游戏开始事件
	Botzone.gio.on('gametable.start', function (data) {
		Botzone.ldscreen.fadeIn();
		Botzone.replacePage("/match/" + data);
	});

	var frmSelectBotByUser, frmSelectBotByID;
	frmSelectBotByID = $("#frmSelectBotByID");
	frmSelectBotByUser = $("#frmSelectBotByUser");
	$(".select-bot-by-user").one("click", function () {
		frmSelectBotByUser.find("button").click();
	});
	$(".select-bot-by-id").popover({
		title: __("gametable.slot.botselect.byid"),
		content: frmSelectBotByID.remove(),
		container: "body",
		html: true
	});

	// 将下拉框变成自动完成组合框
	var $cmb = frmSelectBotByUser.find(".cmbUserName").selectize();
	Botzone.onExit(function () {
		$cmb[0].selectize.destroy();
	});

	$(".playerslot").each(function (i, ele) {
		var me = $(ele);
		var name = me.find("input.txtSlotName");
		slotdom[i] = me;
		slots[i] = {
			type: me.find("select.cmbSlotType").val(),
			name: name.val(),
			id: name.data("id")
		}
	});

	list = $("#dlgBotSelect .list-group");
	list.find(".botlistitem").click(function (event) {
		list.find(".botlistitem").removeClass("active");
		currBot = $(this).addClass("active").data("bot");
		txtVersion.val(currBot.versions.length - 1);
	});

	$("#dlgBotSelect .modal-footer button[type=submit]").off("click").on("click", function () {
		var selectedBot = list.find(".botlistitem.active"),
			ver = txtVersion.val();
		if (selectedBot.length == 0 || validateFunctions.checkVersion(ver))
			return;
		var dom = slotdom[currSlot].find("input.txtSlotName")
			.val((slots[currSlot].name = currBot.name) + "【" + ver + "】")
			.data("id", slots[currSlot].id = currBot.versions[ver])
			.data("botid", slots[currSlot].botid = currBot._id)
			.data("ranked", slots[currSlot].ranked = currBot.ranked).change();
		$('#dlgBotSelect').modal('hide');

		// 对 Bot 禁用状态的检查（不阻塞用户）
		Botzone.$get("/mybots/detail/version/" + currBot.versions[ver], { game: gameid }, function (data) { }, function (errorThrown) {
			dom.val("")
				.data("id", slots[currSlot].id = "")
				.data("botid", slots[currSlot].botid = "")
				.data("ranked", slots[currSlot].ranked = false).change();
			Botzone.alert(errorThrown);
		}, true);
	});

	$(".btnCopyID").click(function () {
		Botzone.copy($(this).closest(".playerslot").find("input.txtSlotName").data("id"), __("copy.success"), __("copy.prompt"));
	});

	$("#btnLoadConfig").click(function () {
		var raw = JSON.parse($.cookie("gametable-config-" + gameid) || "{}");
		for (var i = 0; i < raw.length; i++)
			if (raw[i].type == "human")
				raw[i].id = raw[i].name = "";
		OnGametableChange(raw);
		Botzone.gio.emit('gametable.change', slots);
	});
	btnAutoMatch = $("#btnAutoMatch").click(function () {
		if (btnAutoMatch.hasClass("disabled"))
			return;
		Botzone.ldscreen.fadeIn();
		Botzone.gio.emit('gametable.automatch', null, function () {
			Botzone.ldscreen.stop().fadeOut();
		});
	});

	function updateArgu() {
		Botzone.gio.emit('gametable.arguchange', {
			humanTimeout: currReceivedArgu.humanTimeout,
			fork_turnid: currReceivedArgu.forkArgu.turnid
		});
		OnArguChange(currReceivedArgu);
	}

	$("#numTimelimit").change(function () {
		currReceivedArgu.humanTimeout = this.value;
		updateArgu();
	});
	$("#chkEnableLocalAI").change(function () {
		Botzone.gio.emit("gametable.setlocalai", this.checked);
		UpdateCurrPlayer();
	});
	$("#btnForkNoturn").click(function () {
		currReceivedArgu.forkArgu.turnid = 0;
		updateArgu();
	});

	if (currGame.initdata_editor && currGame.initdata_editor.length > 0) {
		if ($(".initdatamsg").length == 0)
			$("#panInitdata").hide().after(currGame.initdata_editor);
		else
			$("#panInitdata").hide();
	}
});

function Rotate() {
	Botzone.gio.emit("gametable.rotate");
}

function SelectBotByID(ctrl) {
	Botzone.$get("/mybots/detail/version/" + $(ctrl).closest("form").find(".txtBotID").val(), { game: gameid }, function (result) {
		slotdom[currSlot].find("input.txtSlotName")
			.val((slots[currSlot].name = result.bot.bot.name) + "【" + result.bot.ver + "】")
			.data("id", slots[currSlot].id = result.bot._id)
			.data("botid", slots[currSlot].botid = result.bot.bot._id)
			.data("ranked", slots[currSlot].ranked = result.bot.bot.ranked).change().click();
	});
}

function SendSlotChange(ctrl, type, slot) {
	if (type == 0) { // select
		slots[slot].type = ctrl.value;
		if (ctrl.value == "owner") {

			// 设置指定栏位为自己
			slotdom[slot].addClass("currplayer").find("input.txtSlotName")
				.val(slots[slot].name = userMe.name)
				.data("origname", userMe.name)
				.data("id", slots[slot].id = userMe._id);

			// 清除掉其他栏位的自己
			for (var i = 0; i < slotdom.length; i++)
				if (slot != i && slots[i].id == userMe._id) {
					slotdom[i].removeClass("currplayer").find("input.txtSlotName")
						.val(slots[i].name = "")
						.data("id", slots[i].id = "");
					slotdom[i].find("select.cmbSlotType").val(slots[i].type = 'human');
				}
		} else {
			slots[slot].name = slots[slot].id = "";
			slotdom[slot].removeClass("currplayer").find("input.txtSlotName").val("").data("id", "");
		}
		if (ctrl.value != "bot") {
			slotdom[slot].find(".dBotSlot").fadeOut(function () {
				slotdom[slot].find(".dSlotName").removeClass("col-md-5").addClass("col-md-10");
			});
		} else {
			slotdom[slot].find(".dBotSlot").fadeIn();
			slotdom[slot].find(".dSlotName").removeClass("col-md-10").addClass("col-md-5");
		}
	} else if (type == 1) { // namebox
		slots[slot].name = ctrl.value;
		slots[slot].id = $(ctrl).data("id");
	}

	var hasRankedBot = false;
	for (i = 0; i < slots.length; i++)
		if (slots[i].type == "bot" && slots[i].id != "" && slots[i].ranked) {
			hasRankedBot = true;
			break;
		}
	if (btnAutoMatch.hasClass("disabled") == (isOwner && hasRankedBot))
		btnAutoMatch.toggleClass("disabled");

	UpdateCurrPlayer();
	Botzone.gio.emit('gametable.change', slots);
}

function SelectLatest() {
	txtVersion.val(currBot.versions.length - 1);
}

function ViewUserBot(ctrl) {
	var firstone = list.find(".botlistitem:eq(0)");
	Botzone.$get("/listbots/" + $(ctrl).closest("form").find(".cmbUserName").val(), { game: gameid }, function (result) {
		list.find(".botlistitem:gt(0)").remove();
		firstone.addClass("hidden");
		for (var i = 0; i < result.bots.length; i++) {
			var template = firstone.clone(true).removeClass("hidden");
			template.data("bot", result.bots[i]);
			template.find("h4").text(result.bots[i].name);
			template.find("p.botversion span").text(__("gametable.slot.botselect.version.info", result.bots[i].versions.length - 1));
			template.find("p.botdesc").text(result.bots[i].desc);
			list.append(template);
		}
	}, function (errorThrown) {
		firstone.removeClass("hidden").find("h4").text(__("gametable.slot.botselect.fail") + errorThrown);
	});
}

function Start(ctrl) {
	for (var i = 0; i < slots.length; i++) {
		if (slots[i].type == "" || slots[i].id == "") {
			$(ctrl).highlight(1000).tooltip("enable").attr("data-original-title", __("gametable.nonfull")).tooltip("show");
			return;
		}
	}

	// 保存配置
	$.cookie("gametable-config-" + gameid, JSON.stringify(slots), { path: '/' });

	Botzone.gio.emit('gametable.start', $("#txtInitData").val());
}

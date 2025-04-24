/// <reference path="jquery-2.1.0.js" />
/// <reference path="bootstrap.js" />
/// <reference path="../../ideref/TweenMax.js" />
/// <reference path="global.js" />
/*
 * Botzone 2.0 天梯排行自助对局页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone 2.0的global脚本框架
 */

var $tabBots, $dFloatInfo, $sSelectedCount, $sMaxIncrease, $sMaxDecrease;

//// 开局表单逻辑 - 始

validateFunctions.checkPlayerCount = function () {
	if ($tabBots.find("tr.selected").length != currBot.game.min_player_num)
		return __("rankmatch.listsizemismatch");
};

var confRankMatchForm = new FormConfig({
	method: "post",
	action: "#",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			BeginMatchAnimation(function () {
				window.location.href = '/match/' + result.matchid;
			});
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(errorThrown, true);
	}
});

//// 开局表单逻辑 - 终

function BeginMatchAnimation(cb) {
	TweenMax.to("body", 2, {
		scale: 0.8, opacity: 0, ease: Sine.easeIn
	});
	TweenMax.to($tabBots.find("tr.selected"), 2, {
		scale: 2, ease: Sine.easeIn, onComplete: cb
	});
}

$(document).ready(function () {
	$dFloatInfo = $("#dFloatInfo");
	$tabBots = $("#tabBots");
	$sSelectedCount = $("#sSelectedCount");
	$sMaxDecrease = $("#sMaxDecrease");
	$sMaxIncrease = $("#sMaxIncrease");
	$tabBots.find("tr:not(:first-child, .disabled)").click(function () {
		var $this = $(this);
		$this.toggleClass("selected");
		$this.find("input[type=checkbox]")[0].checked = $this.hasClass("selected");
		var $selectedRows = $tabBots.find("tr.selected:not(.disabled)");
		$sSelectedCount.text(($selectedRows.length + 1) + " / " + currBot.game.min_player_num);
		if (($selectedRows.length + 1) == currBot.game.min_player_num)
			$sSelectedCount.addClass("correct");
		else
			$sSelectedCount.removeClass("correct");
		$sMaxIncrease.text(Array.prototype.reduce.call($selectedRows.find(".victory-increase .amount"), function (sum, cur) {
			return sum + parseFloat(cur.innerText);
		}, 0).toFixed(2));
		$sMaxDecrease.text(Array.prototype.reduce.call($selectedRows.find(".defeated-decrease .amount"), function (sum, cur) {
			return sum + parseFloat(cur.innerText);
		}, 0).toFixed(2));
	});
	TweenMax.staggerFromTo($tabBots.find("tr"), 0.5, { opacity: 0, scale: 1.2 },
		{ opacity: 1, scale: 1, ease: Back.easeOut, clearProps: "scale" }, 0.1);
});

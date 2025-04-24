/*
 * Botzone 2.0 天梯排行页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone 2.0的global脚本框架
 */


$(document).ready(function () {
	var botid = window.location.href.split('#');
	if (botid.length > 1) {
		var $bot = $("[data-botid='" + botid[botid.length - 1] + "']").click();
		if ($bot.length != 1) {
			// 淦，现在我只能去找这个 Bot 是第几页的了
			window.location.href = '/game/ranklist/' + currGame._id + '/' + botid[botid.length - 1];
		} else
			$('html, body').animate({
				scrollTop: $bot.offset().top - 60
			}, 300);
	}

	var useLite = $(".rank-table-lite").length > 0;

	$('.quick-match').each(function () {
		var $this = $(this);
		var $form = $($("#frmQuickMatch")[0].outerHTML).prop("id", "").show();
		$form.data("botid", $this.data("botid"));
		if (useLite)
			$this.popover({
				title: __("quickmatch.create.title"),
				content: $form,
				container: "body",
				placement: "top",
				html: true
			});
		else
			$this.popover({
				title: __("quickmatch.create.title"),
				content: $form,
				placement: "left",
				html: true
			});
	});
});

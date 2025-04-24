/*
 * Botzone 2.0 用户排行页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone 2.0的global脚本框架
 */

$(document).ready(function () {
	var userid = window.location.href.split('#');
	if (userid.length > 1) {
		var $user = $("[data-userid='" + userid[userid.length - 1] + "']").click();
		if ($user.length != 1) {
			// 淦，现在我只能去找这人是第几页的了
			window.location.href = '/user/ranklist/' + userid[userid.length - 1];
		} else
			$('html, body').animate({
				scrollTop: $user.offset().top - 60
			}, 300);
	}

	var maxW = 0;
	var $names = $(".gamename").each(function () {
		this.textContent = Botzone.id2game[this.textContent];
		var $this = $(this).css("width", "auto");
		maxW = Math.max($this.width(), maxW);
	});
	TweenMax.fromTo($names, 0.2, { width: 0, opacity: 0 }, { width: maxW, opacity: 1 });
});
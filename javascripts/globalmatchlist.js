/*
 * Botzone 2.0 全局对局页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

var selectedGame;
$(document).ready(function () {
	
	var mapFun = function (g) {
		if (g._id == selectedGame)
			return '<li class="active"><a href="/globalmatchlist?game=' + g._id + '">' + g.name + '</a></li>';
		else
			return '<li><a href="/globalmatchlist?game=' + g._id + '">' + g.name + '</a></li>';
	};
	$(".filter .dropdown.game .dropdown-menu").append(_allGames.map(mapFun).join(''));
	var selected = $(".filter .dropdown li.active");
	selected.closest(".dropdown").find(".selected-name").text(selected.text());

	var time = $("#txtTimeSplitter").datetimepicker();

	$("#btnRecent").click(function () {
		Botzone.replacePage("/globalmatchlist?endid=" +
			Math.floor(new Date(time.val()).getTime() / 1000).toString(16) + "0000000000000000");
	});
	$("#btnPast").click(function () {
		Botzone.replacePage("/globalmatchlist?startid=" +
			Math.floor(new Date(time.val()).getTime() / 1000).toString(16) + "0000000000000000");
	});
});
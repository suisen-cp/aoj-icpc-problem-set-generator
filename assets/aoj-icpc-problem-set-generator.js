$("#input-participant-button").click(function () {
    const user_id = $("#input-participant").val().trim();

    if (user_id.length == 0) return;

    if (user_id.search(/\s/) != -1) {
        alert("Empty characters are not allowed.");
    } else {
        const exists = $("#participants")
            .find(`div:contains("${user_id}")`)
            .filter(function () { return $(this).text().trim() == user_id; })
            .length != 0;

        if (exists) return;

        $("#participants").append(`
            <div class="toast-header" style="display: inline-block;" id="participant-${user_id}">
                ${user_id}
                <button type="button" class="btn-close" onclick="this.parentNode.remove();"></button>
            </div>
        `)
    }
});

const get_year_min = function () {
    return $("#input-year-min").val();
};
const get_year_max = function () {
    return $("#input-year-max").val();
};
const get_rivals = function () {
    rivals = []
    $("#participants")
        .find(`div`)
        .each(function () {
            const user_id = $(this).text().replaceAll(/\s/g, '');
            rivals.push(user_id);
        });
    console.log(rivals);
    return rivals
};

const get_flag_of_including_domestic = function() {
    return $("#input-domestic").val() === "on" ? 1 : 0;
};
const get_flag_of_including_regional = function() {
    return $("#input-regional").val() === "on" ? 1 : 0 ;
};
const get_flag_of_including_jag_domestic = function() {
    return $("#input-jag-domestic").val() === "on" ? 1 : 0;
};
const get_flag_of_including_jag_other = function() {
    return $("#input-jag-other").val() === "on" ? 1 : 0;
};

$("#submit-btn").click(function () {
    const point_list = [
        'uncategorized',
        '100',
        '150',
        '200',
        '250',
        '300',
        '350',
        '400',
        '450',
        '500',
        '550',
        '600',
        '700',
        '800',
        '900',
        '1000',
        '1100',
        '1200-over',
    ];

    const get_problem_num = function (point) {
        return $(`#input-num-${point}`).val()
    };

    for (const p of point_list) {
        console.log(p, get_problem_num(p));
    }

    const include_domestic = get_flag_of_including_domestic();
    const include_regional = get_flag_of_including_regional();
    const include_jag_domestic = get_flag_of_including_jag_domestic();
    const include_jag_other = get_flag_of_including_jag_other();
    const year_min = get_year_min();
    const year_max = get_year_max();
    const rivals = get_rivals();

    const query_param = {
        aoj_rivals: rivals.join(' '),            // ライバル指定
        year_min: year_min,                      // 年度の最小値 (必要に応じて指定)
        year_max: year_max,                      // 年度の最大値 (必要に応じて指定)
        aoj_username: '',                        //
        point_min: 100,                          // 点数の最小値
        point_max: 1200,                         // 点数の最大値
        sort1_by: 'point',                       // ソート key 1
        sort1_order: 'asc',                      // key 1 の並べ替え順
        sort2_by: 'rivals_diff',                 // ソート key 2
        sort2_order: 'desc',                     // key 2 の並べ替え順
        source1: include_domestic,               // 出典に国内予選を含める
        source2: include_regional,               // 出典にアジア地区予選を含める
        source3: include_jag_domestic,           // 出典にJAG模擬国内を含める
        source4: include_jag_other,              // 出典にJAG模擬国内以外を含める
    };

    const url = new URL("http://aoj-icpc.ichyo.jp/?" + new URLSearchParams(query_param).toString());

    let xhr = new XMLHttpRequest();

    xhr.open('GET', url);
    xhr.send();

    xhr.onload = function() {
        alert(`Loaded: ${xhr.status} ${xhr.response}`);
    };
    
    xhr.onerror = function() {
        alert(`Network Error`);
    };
});
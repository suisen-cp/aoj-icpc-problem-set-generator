function get_random_chooser(array) {
    var copy = array.slice(0);
    return function () {
        if (copy.length < 1) { copy = array.slice(0); }
        var index = Math.floor(Math.random() * copy.length);
        var item = copy[index];
        copy.splice(index, 1);
        return item;
    };
};
function random_choice(array, num) {
    chooser = get_random_chooser(array);
    result = []
    for (let i = 0; i < num; ++i) result.push(chooser());
    return result;
};

const BLACK = 'black';
const GRAY = 'gray';
const BROWN = 'brown';
const GREEN = 'green';
const CYAN = 'cyan';
const BLUE = 'blue';
const YELLOW = 'yellow';
const ORANGE = 'orange';
const RED = 'red';
const BRONZE = 'bronze';
const SILVER = 'silver';
const GOLD = 'gold';

const diff_categories = [
    BLACK,
    GRAY,
    BROWN,
    GREEN,
    CYAN,
    BLUE,
    YELLOW,
    ORANGE,
    RED,
    BRONZE,
    SILVER,
    GOLD,
];

const add_participant = function (user_id) {
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
};


$("#input-participant-button").click(function () {
    const user_ids = $("#input-participant").val().trim();

    for (user_id of user_ids.split(' ')) {
        add_participant(user_id);
    }
});

$("#reset-diff").click(function () {
    $("input.table-input").val(0);
});

$("#reset-src").click(function () {
    $("input.src-input").prop('checked', true);
});

$("#reset-date").click(function () {
    $("input.date-input").val('');
});

const get_participants = function () {
    participants = []
    $("#participants")
        .find(`div`)
        .each(function () {
            const user_id = $(this).text().replaceAll(/\s/g, '');
            participants.push(user_id);
        });
    return participants
};

const get_date_min = function () {
    return $("#input-date-min").val();
};
const get_date_max = function () {
    return $("#input-date-max").val();
};

const get_flag_of_including_abc = function () {
    return $("#input-abc").is(':checked');
};
const get_flag_of_including_arc = function () {
    return $("#input-arc").is(':checked');
};
const get_flag_of_including_agc = function () {
    return $("#input-agc").is(':checked');
};
const get_flag_of_including_other = function () {
    return $("#input-other").is(':checked');
};

const ABC = 0;
const ARC = 1;
const AGC = 2;
const OTHER = 3;

const get_contest_type = function (contest) {
    const contest_id = contest["id"];

    if (contest_id.match(/abc[0-9]+/)) return ABC;
    if (contest_id.match(/arc[0-9]+/)) return ARC;
    if (contest_id.match(/agc[0-9]+/)) return AGC;

    const rate_change = contest["rate_change"];

    if (rate_change == " ~ 1199") return ABC;
    if (rate_change == " ~ 1999") return ABC;
    if (rate_change == " ~ 2799") return ARC;
    if (rate_change == "ALL") return AGC;

    return OTHER;
};

function output(problem_set) {
    $("#output").find("p").remove();
    for (problem of problem_set) {
        diff_category = problem['diff_category'];
        problem_id = problem['id'];
        $("#output").append(`<p><span class="difficulty-circle ${diff_category}"></span>${problem_id}</p>`);
    }
};

$("#submit-btn").click(function () {
    const get_problem_num = function (diff_category) {
        return $(`#input-num-${diff_category}`).val()
    };

    const problem_num = function () {
        let result = {};
        for (diff_category of diff_categories) {
            result[diff_category] = get_problem_num(diff_category);
        }
        return result;
    }();

    const include_abc = get_flag_of_including_abc();
    const include_arc = get_flag_of_including_arc();
    const include_agc = get_flag_of_including_agc();
    const include_other = get_flag_of_including_other();

    const str_date_min = get_date_min();
    const str_date_max = get_date_max();
    const date_min = new Date(str_date_min);
    const date_max = new Date(str_date_max);

    // const participants = get_participants();

    const promise_load_contests = new Promise(function (resolve, _) {
        const contest_info_url = "https://kenkoooo.com/atcoder/resources/contests.json";
        const contest_info_request = new XMLHttpRequest();
        contest_info_request.open('GET', contest_info_url);
        contest_info_request.responseType = 'json';
        contest_info_request.send();

        contest_info_request.onload = function () {
            const contest_list = contest_info_request.response
                .filter(function (contest) {
                    const start_date = new Date(contest["start_epoch_second"] * 1000);

                    if (str_date_min && start_date < date_min) return false;
                    if (str_date_max && start_date > date_max) return false;

                    const contest_type = get_contest_type(contest);

                    if (contest_type == ABC) {
                        return include_abc;
                    } else if (contest_type == ARC) {
                        return include_arc;
                    } else if (contest_type == AGC) {
                        return include_agc;
                    } else if (contest_type == OTHER) {
                        return include_other;
                    }

                    alert("Somethig wrong.")
                    return false;
                })
                .map(function (contest) {
                    return contest["id"];
                });

            const contests = new Set(contest_list);

            resolve(contests);
        };
        contest_info_request.onerror = function () {
            alert('Network Error.');
            resolve(null);
        };
    });

    promise_load_contests.then(function (contests) {
        const promise_load_problems = new Promise(function (resolve, _) {
            if (contests === null) resolve(null);

            const contest_problem_info_url = "https://kenkoooo.com/atcoder/resources/contest-problem.json";
            const contest_problem_info_request = new XMLHttpRequest();
            contest_problem_info_request.open('GET', contest_problem_info_url);
            contest_problem_info_request.responseType = 'json';
            contest_problem_info_request.send();

            contest_problem_info_request.onload = function () {
                const problem_list = contest_problem_info_request.response
                    .filter(function (contest_problem) {
                        const contest_id = contest_problem["contest_id"];
                        return contests.has(contest_id);
                    })
                    .map(function (contest_problem) {
                        return contest_problem["problem_id"];
                    });

                problems = new Set(problem_list);

                resolve(problems);
            };
            contest_problem_info_request.onerror = function () {
                alert('Network Error.');

                resolve(null);
            };
        });

        promise_load_problems.then(function (problems) {
            const promise_generate_set = new Promise(function (resolve, _) {
                const difficulty_info_url = "https://kenkoooo.com/atcoder/resources/problem-models.json";
                const difficulty_info_request = new XMLHttpRequest();
                difficulty_info_request.open('GET', difficulty_info_url);
                difficulty_info_request.responseType = 'json';
                difficulty_info_request.send();

                const get_diff_category = function (problem) {
                    if (problem in difficulty_info) {
                        const difficulty = difficulty_info[problem]['difficulty'];
                        const index = Math.min(1 + Math.max(0, Math.floor(difficulty / 400)), diff_categories.length - 1);
                        return diff_categories[index];
                    } else {
                        return BLACK;
                    }
                };

                difficulty_info_request.onload = function () {
                    let problems_group_by_diff = {};
                    difficulty_info = difficulty_info_request.response;
                    for (problem of problems) {
                        console.log(problem);
                        const diff_category = get_diff_category(problem);
                        if (!(diff_category in problems_group_by_diff)) {
                            problems_group_by_diff[diff_category] = [];
                        }
                        problems_group_by_diff[diff_category].push(problem)
                    }
                    resolve(problems_group_by_diff);
                };
                difficulty_info_request.onerror = function () {
                    alert('Network Error.');
                    resolve(null);
                };
            });
            promise_generate_set.then(function (problems_group_by_diff) {
                if (problems_group_by_diff === null) return;

                problem_set = []

                for (diff_category of diff_categories) {
                    if (problem_num[diff_category] == 0) continue;

                    if (! (diff_category in problems_group_by_diff) || problems_group_by_diff[diff_category].length < problem_num[diff_category]) {
                        alert(`There are not enough problems. Category: ${diff_category}`);
                        return;
                    }

                    for (problem_id of random_choice(problems_group_by_diff[diff_category], problem_num[diff_category])) {
                        problem_set.push({
                            id: problem_id,
                            diff_category: diff_category
                        });
                    }
                }

                output(problem_set);
            });
        });
    });
});
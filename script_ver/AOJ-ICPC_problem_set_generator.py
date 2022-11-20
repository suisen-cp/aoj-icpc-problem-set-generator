import re
import urllib.parse
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from random import sample, shuffle
from typing import Dict, List, Optional, Tuple, Union

import requests


@dataclass
class Source:
    contest_type: str
    contest_name: str
    year: int
    task_id: str

    @staticmethod
    def create(source_str: str) -> 'Source':
        return Source(
            contest_type=Source.__get_contest_type(source_str),
            contest_name=Source.__get_contest_name(source_str),
            year=Source.__get_year(source_str),
            task_id=Source.__get_task_id(source_str)
        )

    @staticmethod
    def __get_year(source_str: str) -> int:
        year_match = re.search(r'2[0-9]{3}', source_str)
        assert year_match
        return int(year_match.group())
    
    @staticmethod
    def __get_contest_name(source_str: str) -> str:
        return source_str[:-1]

    @staticmethod
    def __get_contest_type(source_str: str) -> str:
        contest_type_match = re.search(r'^(.*)2[0-9]{3}.*', source_str)
        assert contest_type_match
        return contest_type_match.group(1)
    
    @staticmethod
    def __get_task_id(source_str: str) -> str:
        return source_str[-1]


@dataclass
class Problem:
    diff: str
    id: Optional[str]
    title: str
    source: Source
    solved: int

    @staticmethod
    def create(l: List[str]) -> 'Problem':
        return Problem(
            diff=l[0],
            id=l[1],
            title=l[2],
            source=Source.create(l[3]),
            solved=int(l[4]) if l[4] != '(未収録)' else 0
        )

    def exists_judge_on_AOJ(self) -> bool:
        return self.id is not None


class AOJICPCParser(HTMLParser):
    __index_diff = 0
    __index_id = 1
    __index_title = 2
    __index_source = 3
    __index_solved = 4

    def __init__(self, *, convert_charrefs: bool = ...) -> None:
        self.reset_state()
        super().__init__(convert_charrefs=convert_charrefs)
    
    def reset_state(self) -> None:
        # 問題一覧の <tr> タグ内か
        self.__in_problem_row = False
        # 問題一覧の <table> タグ内か
        self.__in_problem_table = False
        # 問題一覧の <tbody> タグ内か
        self.__in_problem_table_body = False
        # 問題情報 [diff, id, 問題名, 出典, Solved, Vote Link]
        self.__problem_info = []
        # defaultdict: diff -> problem list
        self.problems = defaultdict(list)
    
    @staticmethod
    def __is_problem_table(attrs: List[Tuple[str, Optional[str]]]) -> bool:
        for attr, value in attrs:
            if attr == 'class' and value == 'problem-table':
                return True
        return False
    
    @staticmethod
    def __is_solved_by_rivals(attrs: List[Tuple[str, Optional[str]]]) -> bool:
        for attr, value in attrs:
            if attr == 'class' and value == 'rivals-only':
                return True
        return False
    
    @staticmethod
    def __get_id(attrs: List[Tuple[str, Optional[str]]]) -> Optional[str]:
        for attr, value in attrs:
            if attr == 'href' and value:
                matched = re.search(r'id=([0-9]+)', value)
                if matched:
                    return matched.group(1)
        return None

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if self.__in_problem_table:
            if self.__in_problem_table_body:
                if self.__in_problem_row:
                    if len(self.__problem_info) == AOJICPCParser.__index_id and tag == 'a':
                        problem_id = AOJICPCParser.__get_id(attrs)
                        self.__problem_info.append(problem_id)
                elif tag == 'tr':
                    if AOJICPCParser.__is_solved_by_rivals(attrs):
                        return
                    self.__in_problem_row = True
            elif tag == 'tbody':
                self.__in_problem_table_body = True
        elif tag == 'table':
            self.__in_problem_table = AOJICPCParser.__is_problem_table(attrs)

    def handle_endtag(self, tag: str) -> None:
        if not self.__in_problem_table:
            return
        if tag == 'table':
            self.__in_problem_table = False
            return

        if not self.__in_problem_table_body:
            return
        if tag == 'tbody':
            self.__in_problem_table_body = False
            return

        if not self.__in_problem_row:
            return
        if tag == 'tr':
            if not self.__problem_info:
                return
            self.__in_problem_row = False
            problem = Problem.create(self.__problem_info)
            if problem.exists_judge_on_AOJ():
                self.problems[problem.diff].append(problem)
            self.__problem_info = []

    def handle_data(self, data: str) -> None:
        if not self.__in_problem_row:
            return

        # 不要な空白,favを削除
        data = re.sub(r'\s+', ' ', re.sub(r'\s*\(☆+\)\s*', '', data).strip())

        if data:
            self.__problem_info.append(data)


@dataclass
class Query:
    rivals: List[str]
    year_min: str
    year_max: str
    diff_min: int
    diff_max: int
    include_domestic: bool
    include_regional: bool
    include_jag_domestic: bool
    include_jag_other: bool

    @staticmethod
    def create(
        *,
        rivals: List[str] = [],
        year_min: Union[int, str]='',
        year_max: Union[int, str]='',
        diff_min: int=100,
        diff_max: int=1200,
        include_domestic: bool=True,
        include_regional: bool=True,
        include_jag_domestic: bool=True,
        include_jag_other: bool=True
    ) -> 'Query':
        return Query(
            rivals=rivals,
            year_min=str(year_min),
            year_max=str(year_max),
            diff_min=diff_min,
            diff_max=diff_max,
            include_domestic=include_domestic,
            include_regional=include_regional,
            include_jag_domestic=include_jag_domestic,
            include_jag_other=include_jag_other
        )
    
    def query_parameters(self):
        return {
            'aoj_rivals': ' '.join(self.rivals),       # ライバル指定
            'year_min': self.year_min,                 # 年度の最小値 (必要に応じて指定)
            'year_max': self.year_max,                 # 年度の最大値 (必要に応じて指定)
            'aoj_username': '',                        #
            'point_min': self.diff_min,                # 点数の最小値
            'point_max': self.diff_max,                # 点数の最大値
            'sort1_by': 'point',                       # ソート key 1
            'sort1_order': 'asc',                      # key 1 の並べ替え順
            'sort2_by': 'rivals_diff',                 # ソート key 2
            'sort2_order': 'desc',                     # key 2 の並べ替え順
            'source1': int(self.include_domestic),     # 出典に国内予選を含める
            'source2': int(self.include_regional),     # 出典にアジア地区予選を含める
            'source3': int(self.include_jag_domestic), # 出典にJAG模擬国内を含める
            'source4': int(self.include_jag_other),    # 出典にJAG模擬国内以外を含める
        }
    
    def query_url(self) -> str:
        return f'http://aoj-icpc.ichyo.jp/?{urllib.parse.urlencode(self.query_parameters())}'


class ProblemSetGenerator:
    def __init__(self, points: Dict[str, int], query: Query) -> None:
        self.points = points
        self.query = query
    
    def get_problem_set(self, *, do_shuffle: bool=False) -> List[Problem]:
        parser = AOJICPCParser()
        parser.feed(requests.get(self.query.query_url()).text)

        result : List[Problem] = []

        for p, num in points.items():
            if not num:
                continue
            result.extend(sample(parser.problems[p], num))
        
        if do_shuffle:
            shuffle(result)

        return result

if __name__ == '__main__':
    # セットの点数配分
    points = {
        '?': 0,
        '100': 0,
        '200': 0,
        '250': 0,
        '300': 1,
        '350': 0,
        '400': 1,
        '450': 0,
        '500': 1,
        '550': 2,
        '600': 3,
        '700': 3,
        '800': 2,
        '900': 1,
        '1000': 0,
        '1100': 0,
        '1200+': 0,
    }

    rivals = [
        'otera',
        'suisen',
        'kencho',
        'BuBuDuKe',
        'mitei',
    ]

    query = Query.create(
        # ライバル指定したユーザが解いたことのある問題は除外
        rivals=rivals
    )

    print(query.query_url())

    problem_set = ProblemSetGenerator(points=points, query=query).get_problem_set(do_shuffle=True)

    for i, prob in enumerate(problem_set):
        print(f"{chr(ord('A') + i)}. {prob.id}")

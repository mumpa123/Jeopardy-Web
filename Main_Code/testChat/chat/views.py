from django.shortcuts import render
import csv 
# Create your views here.
def index(request):
    return render(request, "chat/index.html")

    
def room(request, room_name):
    data = {}
    with open("chat/test.csv", "r") as file:
        csv_reader = csv.reader(file,delimiter=',')
        for num,row in enumerate(csv_reader):
            data[num] = row
    return render(request, "chat/room.html", {"tempvar": data, "room_name": room_name})



#game.html will contain jquery that will show various different html depending on host,player, or board
#i can use var type_html = {{% url 'name' %}}; for example i think.
def host(request, season_num, show_num):
    #grab the season and show from url and pass into content to be given back in data sent in
    #i then use templating like this {{ tempvar|json_script:"csv_data" }} to grab that data within
    # the html document. quite interesting and cool actually. i dont like using things when
    # i dont understand where it comes from but since i have no time as i have 3 days i must
    # allow myself to not know for now.


    single = {
        "categories": {},
        "clues": {},
        "answers": {},
    }
    double = {
        "categories": {},
        "clues": {},
        "answers": {},
    }
    final = {}


    file_name = "chat/jeopardy_clue_data/season_" + str(season_num) + "/episode_" + str(show_num) + ".csv"
    with open(file_name, "r") as file:
        csv_reader = csv.reader(file,delimiter='|')
        for num,row in enumerate(csv_reader):
            if num > 0:
                break
            data_var = row
        
        for clue_num,val in enumerate(data_var):
            # 0-5 are categories for single
            if clue_num <= 5:
                single["categories"][str(clue_num)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 35:
                key2 = clue_num - 5
                single["clues"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 65:
                key2 = clue_num - 35
                single["answers"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 71:
                key2 = clue_num - 65
                double["categories"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 101:
                key2 = clue_num - 71
                double["clues"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 131:
                key2 = clue_num - 101
                double["answers"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 132:
                # key2 = clue_num - 131
                final["category"] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 133:
                final["clue"] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 134:
                final["answer"] = val.strip('b').strip("'").strip('"')



      
    clues = {
        "single": single,
        "double": double,
        "final": final,
    }  

    content = {
        "type": "host",
        "season_num": season_num,
        "show_num": show_num,
        "clues": clues,
    }


    
    return render(request, "chat/game.html",content)


def player(request,player_name,player_num):

    content = {
        "type": "player",
        "player_name": player_name,
        "player_num": player_num,
    }
    return render(request,"chat/game.html",content)


#i may need to pass in season_num and show_num for board as well else imay need to send that data to the board
#person so it can show the clues etc. so maybe better to have the data there as well. probably i think.
def board(request,season_num,show_num):
    single = {
        "categories": {},
        "clues": {},
        "answers": {},
    }
    double = {
        "categories": {},
        "clues": {},
        "answers": {},
    }
    final = {}


    file_name = "chat/jeopardy_clue_data/season_" + str(season_num) + "/episode_" + str(show_num) + ".csv"
    with open(file_name, "r") as file:
        csv_reader = csv.reader(file,delimiter='|')
        for num,row in enumerate(csv_reader):
            if num > 0:
                break
            data_var = row
        
        for clue_num,val in enumerate(data_var):
            # 0-5 are categories for single
            if clue_num <= 5:
                single["categories"][str(clue_num)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 35:
                key2 = clue_num - 5
                single["clues"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 65:
                key2 = clue_num - 35
                single["answers"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 71:
                key2 = clue_num - 65
                double["categories"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 101:
                key2 = clue_num - 71
                double["clues"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 131:
                key2 = clue_num - 101
                double["answers"][str(key2)] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 132:
                # key2 = clue_num - 131
                final["category"] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 133:
                final["clue"] = val.strip('b').strip("'").strip('"')
            elif clue_num <= 134:
                final["answer"] = val.strip('b').strip("'").strip('"')



      
    clues = {
        "single": single,
        "double": double,
        "final": final,
    }  

    content = {
        "type": "board",
        "season_num": season_num,
        "show_num": show_num,
        "clues": clues,
    }
    return render(request, "chat/game.html",content)

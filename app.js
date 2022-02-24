const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

const format = require("date-fns/format");
const parseISO = require("date-fns/parseISO");
var isValid = require("date-fns/isValid");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

let invalidText = "";

const isDateValid = (d) => {
  return isValid(parseISO(d));
};

const isPriorityValid = (p) => {
  return p === "HIGH" || p === "MEDIUM" || p === "LOW";
};

const isStatusValid = (s) => {
  return s === "TO DO" || s === "IN PROGRESS" || s === "DONE";
};

const isCategoryValid = (c) => {
  return c === "WORK" || c === "HOME" || c === "LEARNING";
};

const hasStatusPriorityCategory = (request) => {
  return (
    request.status !== undefined &&
    request.priority !== undefined &&
    request.category !== undefined &&
    isPriorityValid(request.priority) &&
    isStatusValid(request.status) &&
    isCategoryValid(request.category)
  );
};

const hasStatusPriority = (request) => {
  return (
    request.status !== undefined &&
    request.priority !== undefined &&
    request.category === undefined &&
    isStatusValid(request.status) &&
    isPriorityValid(request.priority)
  );
};

const hasStatusCategory = (request) => {
  return (
    request.status !== undefined &&
    request.priority === undefined &&
    request.category !== undefined &&
    isStatusValid(request.status) &&
    isCategoryValid(request.category)
  );
};

const hasPriorityCategory = (request) => {
  return (
    request.status === undefined &&
    request.priority !== undefined &&
    request.category !== undefined &&
    isPriorityValid(request.priority) &&
    isCategoryValid(request.category)
  );
};

const hasStatus = (request) => {
  return (
    request.status !== undefined &&
    request.priority === undefined &&
    request.category === undefined &&
    isStatusValid(request.status)
  );
};

const hasPriority = (request) => {
  return (
    request.status === undefined &&
    request.priority !== undefined &&
    request.category === undefined &&
    isPriorityValid(request.priority)
  );
};

const hasCategory = (request) => {
  return (
    request.status === undefined &&
    request.priority === undefined &&
    request.category !== undefined &&
    isCategoryValid(request.category)
  );
};

app.get("/todos/", async (request, response) => {
  const { status, priority, category, search_q } = request.query;
  let todoGetQuery = "";
  console.log(search_q);
  if (search_q === undefined) {
    switch (true) {
      case hasStatusPriorityCategory(request.query):
        todoGetQuery = `SELECT * FROM todo where status="${status}" and priority="${priority}" and category="${category}";`;
        break;
      case hasStatusPriority(request.query):
        todoGetQuery = `SELECT * FROM todo where status="${status}" and priority="${priority}";`;
        break;
      case hasStatusCategory(request.query):
        todoGetQuery = `SELECT * FROM todo where status="${status}" and category="${category}";`;
        break;
      case hasPriorityCategory(request.query):
        todoGetQuery = `SELECT * FROM todo where priority="${priority}" and category="${category}";`;
        break;
      case hasStatus(request.query):
        todoGetQuery = `SELECT * FROM todo where status="${status}";`;
        break;
      case hasPriority(request.query):
        todoGetQuery = `SELECT * FROM todo where priority="${priority}";`;
        break;
      case hasCategory(request.query):
        todoGetQuery = `SELECT * FROM todo where category="${category}";`;
        break;
      default:
        todoGetQuery = "";
    }
  } else {
    todoGetQuery = `SELECT * FROM todo where todo like "%${search_q}%";`;
  }

  console.log(todoGetQuery);
  if (todoGetQuery === "") {
    response.status(400);
    if (priority !== undefined && !isPriorityValid(priority)) {
      invalidText = "Invalid Todo Priority";
    }
    if (status !== undefined && !isStatusValid(status)) {
      invalidText = "Invalid Todo Status";
    }
    if (category !== undefined && !isCategoryValid(category)) {
      invalidText = "Invalid Todo Category";
    }
    console.log(invalidText);
    response.send(invalidText);
  } else {
    const listOfToDo = await db.all(todoGetQuery);
    let result = listOfToDo.map((todoItem) => {
      return {
        id: todoItem.id,
        todo: todoItem.todo,
        priority: todoItem.priority,
        status: todoItem.status,
        category: todoItem.category,
        dueDate: todoItem.due_date,
      };
    });
    console.log(result);
    response.send(result);
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  console.log(todoId);
  const getTodoItemQuery = `SELECT * FROM todo WHERE id=${todoId};`;
  const eachItem = await db.get(getTodoItemQuery);
  const result = {
    id: eachItem.id,
    todo: eachItem.todo,
    priority: eachItem.priority,
    status: eachItem.status,
    category: eachItem.category,
    dueDate: eachItem.due_date,
  };
  response.send(result);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isDateValid(date)) {
    console.log(date);
    let getAgendaQuery = `SELECT * FROM todo WHERE due_date='${date}';`;
    let listAgenda = await db.all(getAgendaQuery);
    console.log(listAgenda);
    let result = listAgenda.map((getAgenda) => {
      return {
        id: getAgenda.id,
        todo: getAgenda.todo,
        priority: getAgenda.priority,
        status: getAgenda.status,
        category: getAgenda.category,
        dueDate: getAgenda.due_date,
      };
    });
    response.send(result);
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  let insertQuery = "";
  let responseText = "";
  if (!isPriorityValid(priority)) {
    responseText = "Invalid Todo Priority";
  } else if (!isCategoryValid(category)) {
    responseText = "Invalid Todo Category";
  } else if (!isStatusValid(status)) {
    responseText = "Invalid Todo Status";
  } else if (!isDateValid(dueDate)) {
    responseText = "Invalid Due Date";
  }

  if (responseText === "") {
    insertQuery = `INSERT INTO todo 
        (id,todo,priority,status,category,due_date) 
        VALUES 
        (${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
    const postResponse = await db.run(insertQuery);
    console.log(postResponse);
    response.send("Todo Successfully Added");
  } else {
    response.status(400);
    response.send(responseText);
  }
});

app.put("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;
  let updateTodoQuery = "";
  let responseText = "";
  if (priority !== undefined) {
    if (isPriorityValid(priority)) {
      updateTodoQuery = `UPDATE todo set priority="${priority}" where 
                id=${todoId};`;
      responseText = "Priority Updated";
    } else {
      updateTodoQuery = "";
      responseText = "Invalid Todo Priority";
    }
  } else if (status !== undefined) {
    if (isStatusValid(status)) {
      responseText = "Status Updated";
      updateTodoQuery = `UPDATE todo set status="${status}" where id=${todoId};`;
    } else {
      updateTodoQuery = "";
      responseText = "Invalid Todo Status";
    }
  } else if (category !== undefined) {
    if (isCategoryValid(category)) {
      responseText = "Category Updated";
      updateTodoQuery = `UPDATE todo set category="${category}" where id=${todoId};`;
    } else {
      updateTodoQuery = "";
      responseText = "Invalid Todo Category";
    }
  } else if (todo !== undefined) {
    responseText = "Todo Updated";
    updateTodoQuery = `UPDATE todo set todo="${todo}" where id=${todoId};`;
  } else if (dueDate !== undefined) {
    if (isDateValid(dueDate)) {
      responseText = "Due Date Updated";
      const formattedDate = format(parseISO(dueDate), "yyyy-MM-dd");
      updateTodoQuery = `UPDATE todo set due_date="${formattedDate}" where id=${todoId};`;
    } else {
      responseText = "Invalid Due Date";
      updateTodoQuery = "";
    }
  }

  if (updateTodoQuery === "") {
    response.status(400);
    response.send(responseText);
  } else {
    await db.run(updateTodoQuery);
    response.send(responseText);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id=${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;

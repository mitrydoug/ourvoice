import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FORUMS = ["global", "us"];

export default buildModule("ForumMockedRegistryModule", (m) => {

  const address1 = m.getAccount(0);
  const address2 = m.getAccount(1);
  const address3 = m.getAccount(2);

  const mockedZKRegistry = m.contract("MockZKRegistry");

  m.call(mockedZKRegistry, "register", ["us"], { from: address1, id: "register1" });
  m.call(mockedZKRegistry, "register", [""], { from: address2, id: "register2" });
  m.call(mockedZKRegistry, "register", ["us"], { from: address3, id: "register3" });

  const forums = Object.fromEntries(
    FORUMS.map((forum) => {
      return [
        forum,
        m.contract("Forum", [mockedZKRegistry, forum == "global" ? "" : forum], { id: `Forum_${forum}` }),
      ]
    })
  );

  m.call(forums["us"], "addStatement", ["Apple pie is the best kind of pie!"], { id: "addStatement1", from: address1 });
  m.call(forums["global"], "addStatement", ["Blackberry pie is the best kind of pie"], { id: "addStatement2", from: address2 });

  return { registry: mockedZKRegistry, ...forums };

});
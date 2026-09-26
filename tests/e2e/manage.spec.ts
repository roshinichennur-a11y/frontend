import { test, expect } from "@playwright/test";

test("edit and delete huddles with cancellation and reload persistence", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button", {name:"Edit question",exact:true}).first().click();
  const editor=page.getByRole("dialog",{name:"Edit huddle question"});
  await editor.getByLabel("Question",{exact:true}).fill("What breast cancer evidence should I review before discussing clinical trials?");
  await editor.getByRole("button",{name:"Save question",exact:true}).click();
  await expect(editor).not.toBeVisible();
  await expect(page.getByText("What breast cancer evidence should I review before discussing clinical trials?",{exact:true})).toBeVisible();
  await expect(page.getByText("Ready to review",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText("What breast cancer evidence should I review before discussing clinical trials?",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Delete",exact:true}).first().click();
  const deletion=page.getByRole("dialog",{name:"Delete huddle",exact:true});
  await deletion.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("button",{name:"Delete",exact:true})).toHaveCount(2);
  await page.getByRole("button",{name:"Delete",exact:true}).first().click();
  await deletion.getByRole("button",{name:"Delete huddle",exact:true}).click();
  await expect(page.getByRole("button",{name:"Delete",exact:true})).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("button",{name:"Delete",exact:true})).toHaveCount(1);
  await expect(page.getByText("What breast cancer evidence should I review before discussing clinical trials?",{exact:true})).toHaveCount(0);
});
